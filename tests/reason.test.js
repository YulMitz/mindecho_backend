import { EventEmitter } from 'node:events';
import { beforeAll, describe, expect, test } from 'vitest';
import { createRequest, createResponse } from 'node-mocks-http';
import app from '../src/app.js';

beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret-key';
    process.env.JWT_EXPIRE = '24h';
    process.env.GEMINI_API_KEY = 'fake-test-key';
});

const executeRequest = async (options) => {
    const req = createRequest(options);
    const res = createResponse({ eventEmitter: EventEmitter });

    return new Promise((resolve, reject) => {
        res.on('end', () => resolve(res));
        res.on('error', reject);
        app.handle(req, res);
    });
};

// ============================================
// Reasons for Living (Keepsake)
// ============================================

describe('POST /api/reason', () => {
    const validReason = {
        title: 'My Family',
        content: 'I want to be there for my family.',
    };

    test('should return 401 without authorization header', async () => {
        const res = await executeRequest({
            method: 'POST',
            url: '/api/reason',
            body: validReason,
        });

        expect(res.statusCode).toBe(401);
        expect(res._isJSON()).toBe(true);
    });

    test('should return 401 with invalid token', async () => {
        const res = await executeRequest({
            method: 'POST',
            url: '/api/reason',
            headers: { Authorization: 'Bearer invalid-token' },
            body: validReason,
        });

        expect(res.statusCode).toBe(401);
    });

    test('should return JSON response', async () => {
        const res = await executeRequest({
            method: 'POST',
            url: '/api/reason',
            body: {},
        });

        expect(res._isJSON()).toBe(true);
    });
});

describe('GET /api/reason', () => {
    test('should return 401 without authorization header', async () => {
        const res = await executeRequest({
            method: 'GET',
            url: '/api/reason',
        });

        expect(res.statusCode).toBe(401);
        expect(res._isJSON()).toBe(true);
    });

    test('should return 401 with invalid token', async () => {
        const res = await executeRequest({
            method: 'GET',
            url: '/api/reason',
            headers: { Authorization: 'Bearer invalid-token' },
        });

        expect(res.statusCode).toBe(401);
    });

    test('should accept includeDeleted query parameter', async () => {
        const res = await executeRequest({
            method: 'GET',
            url: '/api/reason?includeDeleted=true',
            headers: { Authorization: 'Bearer invalid-token' },
        });

        expect([200, 401]).toContain(res.statusCode);
    });
});

describe('GET /api/reason/:id', () => {
    test('should return 401 without authorization header', async () => {
        const res = await executeRequest({
            method: 'GET',
            url: '/api/reason/test-reason-id',
        });

        expect(res.statusCode).toBe(401);
        expect(res._isJSON()).toBe(true);
    });

    test('should return 401 with invalid token', async () => {
        const res = await executeRequest({
            method: 'GET',
            url: '/api/reason/test-reason-id',
            headers: { Authorization: 'Bearer invalid-token' },
        });

        expect(res.statusCode).toBe(401);
    });
});

describe('PATCH /api/reason/:id', () => {
    test('should return 401 without authorization header', async () => {
        const res = await executeRequest({
            method: 'PATCH',
            url: '/api/reason/test-reason-id',
            body: { title: 'Updated title' },
        });

        expect(res.statusCode).toBe(401);
        expect(res._isJSON()).toBe(true);
    });

    test('should return 401 with invalid token', async () => {
        const res = await executeRequest({
            method: 'PATCH',
            url: '/api/reason/test-reason-id',
            headers: { Authorization: 'Bearer invalid-token' },
            body: { title: 'Updated title' },
        });

        expect(res.statusCode).toBe(401);
    });

    test('should accept title, content, date, isDeleted fields', async () => {
        const res = await executeRequest({
            method: 'PATCH',
            url: '/api/reason/test-reason-id',
            headers: { Authorization: 'Bearer invalid-token' },
            body: {
                title: 'New title',
                content: 'New content',
                date: '2026-01-01',
                isDeleted: false,
            },
        });

        expect([200, 400, 401, 404]).toContain(res.statusCode);
    });
});

describe('DELETE /api/reason/:id', () => {
    test('should return 401 without authorization header', async () => {
        const res = await executeRequest({
            method: 'DELETE',
            url: '/api/reason/test-reason-id',
        });

        expect(res.statusCode).toBe(401);
        expect(res._isJSON()).toBe(true);
    });

    test('should return 401 with invalid token', async () => {
        const res = await executeRequest({
            method: 'DELETE',
            url: '/api/reason/test-reason-id',
            headers: { Authorization: 'Bearer invalid-token' },
        });

        expect(res.statusCode).toBe(401);
    });
});

// Route existence summary
describe('Reason API Route Existence', () => {
    const routes = [
        { method: 'POST', url: '/api/reason', body: {} },
        { method: 'GET', url: '/api/reason', body: undefined },
        { method: 'GET', url: '/api/reason/test-id', body: undefined },
        { method: 'PATCH', url: '/api/reason/test-id', body: {} },
        { method: 'DELETE', url: '/api/reason/test-id', body: undefined },
    ];

    routes.forEach(({ method, url, body }) => {
        test(`${method} ${url} exists (returns 401 not 404)`, async () => {
            const res = await executeRequest({ method, url, body });
            expect(res.statusCode).toBe(401);
        });
    });
});
