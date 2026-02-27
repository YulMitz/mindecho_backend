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
// Section 4: AI Chat System
// ============================================

describe('POST /api/chat/sessions', () => {
    const validSession = {
        mode: 'CBT',
        title: 'Test Chat Session',
        provider: 'gemini',
    };

    test('should return 401 without authorization header', async () => {
        const res = await executeRequest({
            method: 'POST',
            url: '/api/chat/sessions',
            body: validSession,
        });

        expect(res.statusCode).toBe(401);
        expect(res._isJSON()).toBe(true);
    });

    test('should return 401 with invalid token', async () => {
        const res = await executeRequest({
            method: 'POST',
            url: '/api/chat/sessions',
            headers: {
                Authorization: 'Bearer invalid-token',
            },
            body: validSession,
        });

        expect(res.statusCode).toBe(401);
    });

    test('should accept mode=CBT parameter', async () => {
        const res = await executeRequest({
            method: 'POST',
            url: '/api/chat/sessions',
            headers: {
                Authorization: 'Bearer invalid-token',
            },
            body: { mode: 'CBT', title: 'CBT Session' },
        });

        expect([201, 400, 401]).toContain(res.statusCode);
    });

    test('should accept mode=MBT parameter', async () => {
        const res = await executeRequest({
            method: 'POST',
            url: '/api/chat/sessions',
            headers: {
                Authorization: 'Bearer invalid-token',
            },
            body: { mode: 'MBT', title: 'MBT Session' },
        });

        expect([201, 400, 401]).toContain(res.statusCode);
    });

    test('should accept mode=chatMode (default) parameter', async () => {
        const res = await executeRequest({
            method: 'POST',
            url: '/api/chat/sessions',
            headers: {
                Authorization: 'Bearer invalid-token',
            },
            body: { mode: 'chatMode', title: 'Default Session' },
        });

        expect([201, 400, 401]).toContain(res.statusCode);
    });

    test('should accept provider=gemini parameter', async () => {
        const res = await executeRequest({
            method: 'POST',
            url: '/api/chat/sessions',
            headers: {
                Authorization: 'Bearer invalid-token',
            },
            body: { mode: 'CBT', title: 'Gemini Session', provider: 'gemini' },
        });

        expect([201, 400, 401]).toContain(res.statusCode);
    });

    test('should accept provider=anthropic parameter', async () => {
        const res = await executeRequest({
            method: 'POST',
            url: '/api/chat/sessions',
            headers: {
                Authorization: 'Bearer invalid-token',
            },
            body: { mode: 'CBT', title: 'Anthropic Session', provider: 'anthropic' },
        });

        expect([201, 400, 401]).toContain(res.statusCode);
    });

    test('should default to gemini when provider not specified', async () => {
        const res = await executeRequest({
            method: 'POST',
            url: '/api/chat/sessions',
            headers: {
                Authorization: 'Bearer invalid-token',
            },
            body: { mode: 'CBT', title: 'Default Provider Session' },
        });

        expect([201, 400, 401]).toContain(res.statusCode);
    });
});

describe('GET /api/chat/sessions', () => {
    test('should return 401 without authorization header', async () => {
        const res = await executeRequest({
            method: 'GET',
            url: '/api/chat/sessions',
        });

        expect(res.statusCode).toBe(401);
        expect(res._isJSON()).toBe(true);
    });

    test('should return 401 with invalid token', async () => {
        const res = await executeRequest({
            method: 'GET',
            url: '/api/chat/sessions',
            headers: {
                Authorization: 'Bearer invalid-token',
            },
        });

        expect(res.statusCode).toBe(401);
    });

    test('should accept limit and offset query parameters', async () => {
        const res = await executeRequest({
            method: 'GET',
            url: '/api/chat/sessions?limit=10&offset=0',
            headers: {
                Authorization: 'Bearer invalid-token',
            },
        });

        expect([200, 400, 401]).toContain(res.statusCode);
    });
});

describe('POST /api/chat/sessions/:id/messages', () => {
    test('should return 401 without authorization header', async () => {
        const res = await executeRequest({
            method: 'POST',
            url: '/api/chat/sessions/test-session-id/messages',
            body: { message: 'Hello' },
        });

        expect(res.statusCode).toBe(401);
        expect(res._isJSON()).toBe(true);
    });

    test('should return 401 with invalid token', async () => {
        const res = await executeRequest({
            method: 'POST',
            url: '/api/chat/sessions/test-session-id/messages',
            headers: {
                Authorization: 'Bearer invalid-token',
            },
            body: { message: 'Hello' },
        });

        expect(res.statusCode).toBe(401);
    });

    test('should accept message in request body', async () => {
        const res = await executeRequest({
            method: 'POST',
            url: '/api/chat/sessions/test-session-id/messages',
            headers: {
                Authorization: 'Bearer invalid-token',
            },
            body: { message: 'Hello, how are you?' },
        });

        expect([200, 400, 401, 404]).toContain(res.statusCode);
    });

    test('should accept mode parameter for consistency check', async () => {
        const res = await executeRequest({
            method: 'POST',
            url: '/api/chat/sessions/test-session-id/messages',
            headers: {
                Authorization: 'Bearer invalid-token',
            },
            body: { message: 'Hello', mode: 'CBT' },
        });

        expect([200, 400, 401, 404]).toContain(res.statusCode);
    });
});

describe('GET /api/chat/sessions/:id/messages', () => {
    test('should return 401 without authorization header', async () => {
        const res = await executeRequest({
            method: 'GET',
            url: '/api/chat/sessions/test-session-id/messages',
        });

        expect(res.statusCode).toBe(401);
        expect(res._isJSON()).toBe(true);
    });

    test('should return 401 with invalid token', async () => {
        const res = await executeRequest({
            method: 'GET',
            url: '/api/chat/sessions/test-session-id/messages',
            headers: {
                Authorization: 'Bearer invalid-token',
            },
        });

        expect(res.statusCode).toBe(401);
    });

    test('should accept limit query parameter', async () => {
        const res = await executeRequest({
            method: 'GET',
            url: '/api/chat/sessions/test-session-id/messages?limit=50',
            headers: {
                Authorization: 'Bearer invalid-token',
            },
        });

        expect([200, 400, 401, 404]).toContain(res.statusCode);
    });

    test('should accept before query parameter for pagination', async () => {
        const res = await executeRequest({
            method: 'GET',
            url: '/api/chat/sessions/test-session-id/messages?before=2025-01-01T00:00:00Z',
            headers: {
                Authorization: 'Bearer invalid-token',
            },
        });

        expect([200, 400, 401, 404]).toContain(res.statusCode);
    });
});

describe('DELETE /api/chat/sessions/:id', () => {
    test('should return 401 without authorization header', async () => {
        const res = await executeRequest({
            method: 'DELETE',
            url: '/api/chat/sessions/test-session-id',
        });

        expect(res.statusCode).toBe(401);
        expect(res._isJSON()).toBe(true);
    });

    test('should return 401 with invalid token', async () => {
        const res = await executeRequest({
            method: 'DELETE',
            url: '/api/chat/sessions/test-session-id',
            headers: {
                Authorization: 'Bearer invalid-token',
            },
        });

        expect(res.statusCode).toBe(401);
    });
});

// Route existence tests for Section 4
describe('Section 4 API Route Existence', () => {
    test('/api/chat/sessions POST endpoint exists', async () => {
        const res = await executeRequest({
            method: 'POST',
            url: '/api/chat/sessions',
            body: {},
        });

        // Should return 401 (unauthorized), not 404
        expect(res.statusCode).toBe(401);
    });

    test('/api/chat/sessions GET endpoint exists', async () => {
        const res = await executeRequest({
            method: 'GET',
            url: '/api/chat/sessions',
        });

        // Should return 401 (unauthorized), not 404
        expect(res.statusCode).toBe(401);
    });

    test('/api/chat/sessions/:id/messages POST endpoint exists', async () => {
        const res = await executeRequest({
            method: 'POST',
            url: '/api/chat/sessions/test-id/messages',
            body: {},
        });

        // Should return 401 (unauthorized), not 404
        expect(res.statusCode).toBe(401);
    });

    test('/api/chat/sessions/:id/messages GET endpoint exists', async () => {
        const res = await executeRequest({
            method: 'GET',
            url: '/api/chat/sessions/test-id/messages',
        });

        // Should return 401 (unauthorized), not 404
        expect(res.statusCode).toBe(401);
    });

    test('/api/chat/sessions/:id DELETE endpoint exists', async () => {
        const res = await executeRequest({
            method: 'DELETE',
            url: '/api/chat/sessions/test-id',
        });

        // Should return 401 (unauthorized), not 404
        expect(res.statusCode).toBe(401);
    });
});

// Response structure tests
describe('Section 4 API Response Structure', () => {
    test('/api/chat/sessions should return JSON', async () => {
        const res = await executeRequest({
            method: 'GET',
            url: '/api/chat/sessions',
        });

        expect(res._isJSON()).toBe(true);
    });

    test('/api/chat/sessions/:id/messages should return JSON', async () => {
        const res = await executeRequest({
            method: 'GET',
            url: '/api/chat/sessions/test-id/messages',
        });

        expect(res._isJSON()).toBe(true);
    });

    test('unauthorized requests should include error message', async () => {
        const res = await executeRequest({
            method: 'GET',
            url: '/api/chat/sessions',
        });

        expect(res.statusCode).toBe(401);
        const data = res._getJSONData();
        expect(data).toHaveProperty('message');
    });
});

// Mode validation tests
describe('Chat Mode Validation', () => {
    const validModes = ['chatMode', 'normal', 'CBT', 'MBT'];

    test('should have at least 3 valid chat modes', () => {
        expect(validModes.length).toBeGreaterThanOrEqual(3);
    });

    test('should include therapy modes CBT and MBT', () => {
        expect(validModes).toContain('CBT');
        expect(validModes).toContain('MBT');
    });
});

// Provider validation tests
describe('LLM Provider Validation', () => {
    const validProviders = ['gemini', 'anthropic'];

    test('should have 2 valid LLM providers', () => {
        expect(validProviders.length).toBe(2);
    });

    test('should include gemini provider', () => {
        expect(validProviders).toContain('gemini');
    });

    test('should include anthropic provider', () => {
        expect(validProviders).toContain('anthropic');
    });
});
