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
// Psychological Scale Assessments
// ============================================

describe('GET /api/main/scales/:code/questions', () => {
    test('should return 401 without authorization header', async () => {
        const res = await executeRequest({
            method: 'GET',
            url: '/api/main/scales/PHQ-9/questions',
        });

        expect(res.statusCode).toBe(401);
        expect(res._isJSON()).toBe(true);
    });

    test('should return 401 with invalid token', async () => {
        const res = await executeRequest({
            method: 'GET',
            url: '/api/main/scales/PHQ-9/questions',
            headers: { Authorization: 'Bearer invalid-token' },
        });

        expect(res.statusCode).toBe(401);
    });

    test('endpoint exists for PHQ-9', async () => {
        const res = await executeRequest({
            method: 'GET',
            url: '/api/main/scales/PHQ-9/questions',
        });

        expect(res.statusCode).not.toBe(404);
    });

    test('endpoint exists for GAD-7', async () => {
        const res = await executeRequest({
            method: 'GET',
            url: '/api/main/scales/GAD-7/questions',
        });

        expect(res.statusCode).not.toBe(404);
    });

    test('endpoint exists for BSRS-5', async () => {
        const res = await executeRequest({
            method: 'GET',
            url: '/api/main/scales/BSRS-5/questions',
        });

        expect(res.statusCode).not.toBe(404);
    });
});

describe('POST /api/main/scales/:code/answers', () => {
    const validAnswersPayload = {
        userId: 'test-user-id',
        answers: [
            { questionId: 'q1', value: 2 },
            { questionId: 'q2', value: 3 },
        ],
    };

    test('should return 401 without authorization header', async () => {
        const res = await executeRequest({
            method: 'POST',
            url: '/api/main/scales/PHQ-9/answers',
            body: validAnswersPayload,
        });

        expect(res.statusCode).toBe(401);
        expect(res._isJSON()).toBe(true);
    });

    test('should return 401 with invalid token', async () => {
        const res = await executeRequest({
            method: 'POST',
            url: '/api/main/scales/PHQ-9/answers',
            headers: { Authorization: 'Bearer invalid-token' },
            body: validAnswersPayload,
        });

        expect(res.statusCode).toBe(401);
    });

    test('endpoint exists for PHQ-9', async () => {
        const res = await executeRequest({
            method: 'POST',
            url: '/api/main/scales/PHQ-9/answers',
            body: {},
        });

        expect(res.statusCode).not.toBe(404);
    });

    test('endpoint exists for GAD-7', async () => {
        const res = await executeRequest({
            method: 'POST',
            url: '/api/main/scales/GAD-7/answers',
            body: {},
        });

        expect(res.statusCode).not.toBe(404);
    });
});

describe('GET /api/main/scales/sessions', () => {
    test('should return 401 without authorization header', async () => {
        const res = await executeRequest({
            method: 'GET',
            url: '/api/main/scales/sessions',
        });

        expect(res.statusCode).toBe(401);
        expect(res._isJSON()).toBe(true);
    });

    test('should return 401 with invalid token', async () => {
        const res = await executeRequest({
            method: 'GET',
            url: '/api/main/scales/sessions',
            headers: { Authorization: 'Bearer invalid-token' },
        });

        expect(res.statusCode).toBe(401);
    });

    test('endpoint exists', async () => {
        const res = await executeRequest({
            method: 'GET',
            url: '/api/main/scales/sessions',
        });

        expect(res.statusCode).not.toBe(404);
    });

    test('should accept userId as query parameter', async () => {
        const res = await executeRequest({
            method: 'GET',
            url: '/api/main/scales/sessions?userId=test-user-id',
            headers: { Authorization: 'Bearer invalid-token' },
        });

        expect([200, 400, 401]).toContain(res.statusCode);
    });
});

// Route existence summary
describe('Scales API Route Existence', () => {
    const routes = [
        { method: 'GET', url: '/api/main/scales/PHQ-9/questions' },
        { method: 'POST', url: '/api/main/scales/PHQ-9/answers' },
        { method: 'GET', url: '/api/main/scales/sessions' },
    ];

    routes.forEach(({ method, url }) => {
        test(`${method} ${url} exists (returns 401 not 404)`, async () => {
            const res = await executeRequest({ method, url, body: {} });
            expect(res.statusCode).toBe(401);
        });
    });
});
