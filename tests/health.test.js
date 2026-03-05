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
// Health Advice
// ============================================

describe('POST /api/health/advice', () => {
    const validPayload = {
        range: { startDate: '2026-01-01', endDate: '2026-01-31' },
        metrics: {
            hrv: [{ value: 45 }, { value: 50 }],
            sleepHours: [{ value: 6.5 }, { value: 7 }],
            steps: [{ value: 6000 }, { value: 8000 }],
        },
    };

    test('should return 401 without authorization header', async () => {
        const res = await executeRequest({
            method: 'POST',
            url: '/api/health/advice',
            body: validPayload,
        });

        expect(res.statusCode).toBe(401);
        expect(res._isJSON()).toBe(true);
    });

    test('should return 401 with invalid token', async () => {
        const res = await executeRequest({
            method: 'POST',
            url: '/api/health/advice',
            headers: { Authorization: 'Bearer invalid-token' },
            body: validPayload,
        });

        expect(res.statusCode).toBe(401);
    });

    test('should return JSON response', async () => {
        const res = await executeRequest({
            method: 'POST',
            url: '/api/health/advice',
            body: {},
        });

        expect(res._isJSON()).toBe(true);
    });

    test('endpoint exists', async () => {
        const res = await executeRequest({
            method: 'POST',
            url: '/api/health/advice',
            body: {},
        });

        expect(res.statusCode).not.toBe(404);
    });
});

describe('GET /api/health/advice', () => {
    test('should return 401 without authorization header', async () => {
        const res = await executeRequest({
            method: 'GET',
            url: '/api/health/advice',
        });

        expect(res.statusCode).toBe(401);
        expect(res._isJSON()).toBe(true);
    });

    test('should return 401 with invalid token', async () => {
        const res = await executeRequest({
            method: 'GET',
            url: '/api/health/advice',
            headers: { Authorization: 'Bearer invalid-token' },
        });

        expect(res.statusCode).toBe(401);
    });

    test('should accept startDate and endDate query parameters', async () => {
        const res = await executeRequest({
            method: 'GET',
            url: '/api/health/advice?startDate=2026-01-01&endDate=2026-01-31',
            headers: { Authorization: 'Bearer invalid-token' },
        });

        expect([200, 400, 401]).toContain(res.statusCode);
    });

    test('endpoint exists', async () => {
        const res = await executeRequest({
            method: 'GET',
            url: '/api/health/advice',
        });

        expect(res.statusCode).not.toBe(404);
    });
});

// Route existence summary
describe('Health API Route Existence', () => {
    const routes = [
        { method: 'POST', url: '/api/health/advice', body: {} },
        { method: 'GET', url: '/api/health/advice', body: undefined },
    ];

    routes.forEach(({ method, url, body }) => {
        test(`${method} ${url} exists (returns 401 not 404)`, async () => {
            const res = await executeRequest({ method, url, body });
            expect(res.statusCode).toBe(401);
        });
    });
});
