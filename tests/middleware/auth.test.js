import { vi, describe, test, expect, beforeAll, beforeEach } from 'vitest';
import { createRequest, createResponse } from 'node-mocks-http';
import jwt from 'jsonwebtoken';

// ─── Mock UserService ─────────────────────────────────────────────────────────
vi.mock('../../src/services/userService.js', () => ({
    UserService: { findById: vi.fn() },
}));

import { authenticate } from '../../src/middleware/auth.js';
import { UserService } from '../../src/services/userService.js';

const SECRET = 'test-jwt-secret-key';
const makeToken = (payload, secret = SECRET) => jwt.sign(payload, secret);

beforeAll(() => {
    process.env.JWT_SECRET = SECRET;
});

// Minimal mock user
const activeUser = { id: 'u1', userId: 'uid-1', isActive: true, email: 'a@test.com' };

describe('authenticate middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = createRequest();
        res = createResponse();
        next = vi.fn();
        vi.clearAllMocks();
    });

    // ── Missing / malformed token ─────────────────────────────────────────────
    test('returns 401 when Authorization header is absent', async () => {
        await authenticate(req, res, next);
        expect(res.statusCode).toBe(401);
        expect(res._getJSONData()).toHaveProperty('message');
        expect(next).not.toHaveBeenCalled();
    });

    test('returns 401 when token is malformed / not a valid JWT', async () => {
        req.headers['authorization'] = 'Bearer not-a-jwt';
        await authenticate(req, res, next);
        expect(res.statusCode).toBe(401);
        expect(next).not.toHaveBeenCalled();
    });

    test('returns 401 when token is signed with a different secret', async () => {
        const token = makeToken({ id: 'u1' }, 'wrong-secret');
        req.headers['authorization'] = `Bearer ${token}`;
        await authenticate(req, res, next);
        expect(res.statusCode).toBe(401);
        expect(next).not.toHaveBeenCalled();
    });

    test('returns 401 when token is expired', async () => {
        const token = jwt.sign({ id: 'u1' }, SECRET, { expiresIn: '-1s' });
        req.headers['authorization'] = `Bearer ${token}`;
        await authenticate(req, res, next);
        expect(res.statusCode).toBe(401);
        expect(next).not.toHaveBeenCalled();
    });

    // ── Valid token but user issues ───────────────────────────────────────────
    test('returns 401 when decoded user does not exist in DB', async () => {
        UserService.findById.mockResolvedValue(null);
        const token = makeToken({ id: 'ghost-user' });
        req.headers['authorization'] = `Bearer ${token}`;
        await authenticate(req, res, next);
        expect(res.statusCode).toBe(401);
        expect(next).not.toHaveBeenCalled();
    });

    test('returns 401 when user account is inactive', async () => {
        UserService.findById.mockResolvedValue({ ...activeUser, isActive: false });
        const token = makeToken({ id: 'u1' });
        req.headers['authorization'] = `Bearer ${token}`;
        await authenticate(req, res, next);
        expect(res.statusCode).toBe(401);
        expect(next).not.toHaveBeenCalled();
    });

    // ── Happy path ────────────────────────────────────────────────────────────
    test('sets req.user and calls next() for a valid token and active user', async () => {
        UserService.findById.mockResolvedValue(activeUser);
        const token = makeToken({ id: 'u1' });
        req.headers['authorization'] = `Bearer ${token}`;
        await authenticate(req, res, next);
        expect(next).toHaveBeenCalledOnce();
        expect(req.user).toStrictEqual(activeUser);
        // Should not send any HTTP response
        expect(res.statusCode).toBe(200); // default (not set by middleware)
    });

    test('passes the decoded user id to UserService.findById', async () => {
        UserService.findById.mockResolvedValue(activeUser);
        const token = makeToken({ id: 'u1' });
        req.headers['authorization'] = `Bearer ${token}`;
        await authenticate(req, res, next);
        expect(UserService.findById).toHaveBeenCalledWith('u1');
    });
});
