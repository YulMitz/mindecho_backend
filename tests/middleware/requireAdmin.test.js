import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';
import { createRequest, createResponse } from 'node-mocks-http';
import { requireAdmin } from '../../src/middleware/requireAdmin.js';

describe('requireAdmin middleware', () => {
    let req, res, next;
    let originalAdmins;

    beforeEach(() => {
        originalAdmins = process.env.ADMIN_USERNAMES;
        req = createRequest();
        res = createResponse();
        next = vi.fn();
    });

    afterEach(() => {
        if (originalAdmins === undefined) delete process.env.ADMIN_USERNAMES;
        else process.env.ADMIN_USERNAMES = originalAdmins;
    });

    test('returns 403 when ADMIN_USERNAMES is empty', () => {
        process.env.ADMIN_USERNAMES = '';
        req.user = { userId: 'alice' };
        requireAdmin(req, res, next);
        expect(res.statusCode).toBe(403);
        expect(next).not.toHaveBeenCalled();
    });

    test('calls next() when user is in allowlist (with surrounding whitespace)', () => {
        process.env.ADMIN_USERNAMES = 'alice, bob , ';
        req.user = { userId: 'alice' };
        requireAdmin(req, res, next);
        expect(next).toHaveBeenCalledOnce();
    });

    test('returns 403 when user is not in allowlist', () => {
        process.env.ADMIN_USERNAMES = 'alice';
        req.user = { userId: 'charlie' };
        requireAdmin(req, res, next);
        expect(res.statusCode).toBe(403);
        expect(next).not.toHaveBeenCalled();
    });

    test('returns 403 when req.user is missing', () => {
        process.env.ADMIN_USERNAMES = 'alice';
        requireAdmin(req, res, next);
        expect(res.statusCode).toBe(403);
        expect(next).not.toHaveBeenCalled();
    });
});
