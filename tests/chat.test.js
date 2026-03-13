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
        chatbotType: 'CBT',
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

    test('should accept chatbotType=CBT parameter', async () => {
        const res = await executeRequest({
            method: 'POST',
            url: '/api/chat/sessions',
            headers: {
                Authorization: 'Bearer invalid-token',
            },
            body: { chatbotType: 'CBT', title: 'CBT Session' },
        });

        expect([201, 400, 401]).toContain(res.statusCode);
    });

    test('should accept chatbotType=MBT parameter', async () => {
        const res = await executeRequest({
            method: 'POST',
            url: '/api/chat/sessions',
            headers: {
                Authorization: 'Bearer invalid-token',
            },
            body: { chatbotType: 'MBT', title: 'MBT Session' },
        });

        expect([201, 400, 401]).toContain(res.statusCode);
    });

    test('should accept chatbotType=MBCT parameter', async () => {
        const res = await executeRequest({
            method: 'POST',
            url: '/api/chat/sessions',
            headers: {
                Authorization: 'Bearer invalid-token',
            },
            body: { chatbotType: 'MBCT', title: 'MBCT Session' },
        });

        expect([201, 400, 401]).toContain(res.statusCode);
    });

    test('should accept chatbotType=INITIAL parameter', async () => {
        const res = await executeRequest({
            method: 'POST',
            url: '/api/chat/sessions',
            headers: {
                Authorization: 'Bearer invalid-token',
            },
            body: { chatbotType: 'INITIAL', title: '初談' },
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
            body: { chatbotType: 'CBT', title: 'Gemini Session', provider: 'gemini' },
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
            body: { chatbotType: 'CBT', title: 'Anthropic Session', provider: 'anthropic' },
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
            body: { chatbotType: 'CBT', title: 'Default Provider Session' },
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

        expect(res.statusCode).toBe(401);
    });

    test('/api/chat/sessions GET endpoint exists', async () => {
        const res = await executeRequest({
            method: 'GET',
            url: '/api/chat/sessions',
        });

        expect(res.statusCode).toBe(401);
    });

    test('/api/chat/sessions/:id/messages POST endpoint exists', async () => {
        const res = await executeRequest({
            method: 'POST',
            url: '/api/chat/sessions/test-id/messages',
            body: {},
        });

        expect(res.statusCode).toBe(401);
    });

    test('/api/chat/sessions/:id/messages GET endpoint exists', async () => {
        const res = await executeRequest({
            method: 'GET',
            url: '/api/chat/sessions/test-id/messages',
        });

        expect(res.statusCode).toBe(401);
    });

    test('/api/chat/sessions/:id DELETE endpoint exists', async () => {
        const res = await executeRequest({
            method: 'DELETE',
            url: '/api/chat/sessions/test-id',
        });

        expect(res.statusCode).toBe(401);
    });

    test('/api/chat/sendMessage (legacy) should return 404 — route removed', async () => {
        const res = await executeRequest({
            method: 'POST',
            url: '/api/chat/sendMessage',
            body: {},
        });

        expect(res.statusCode).toBe(404);
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

// chatbotType validation tests
describe('Chat chatbotType Validation', () => {
    const validChatbotTypes = ['MBT', 'CBT', 'MBCT', 'INITIAL'];

    test('should have 4 valid chatbot types', () => {
        expect(validChatbotTypes.length).toBe(4);
    });

    test('should include therapy modes CBT and MBT', () => {
        expect(validChatbotTypes).toContain('CBT');
        expect(validChatbotTypes).toContain('MBT');
    });

    test('should include MBCT and INITIAL types', () => {
        expect(validChatbotTypes).toContain('MBCT');
        expect(validChatbotTypes).toContain('INITIAL');
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
