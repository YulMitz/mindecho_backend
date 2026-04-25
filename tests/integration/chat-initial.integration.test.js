import { EventEmitter } from 'node:events';
import { vi, describe, expect, test, beforeAll, afterAll } from 'vitest';
import { createRequest, createResponse } from 'node-mocks-http';
import { PrismaClient } from '../../prisma-client/index.js';

// .env.test is loaded by vitest.integration.config.js before this file runs.

// ─── LLM mock ────────────────────────────────────────────────────────────────
// Controls the AI reply text per-test. Tests assign to mockState.responseText.
// The mock also writes the USER message to the DB so round counting stays correct.
const mockState = { responseText: 'Generic AI response.' };

vi.mock('../../src/utils/llm.js', async (importOriginal) => {
    const actual = await importOriginal();
    const { PrismaClient: PC } = await import('../../prisma-client/index.js');
    const prismaForMock = new PC();

    return {
        ...actual, // keep parseInitialModeMarker, INITIAL_MAX_ROUNDS, storeResponse, etc.
        generateResponse: vi.fn(async (sessionId, chatbotType, text) => {
            // Mirror what the real generateResponse does: persist the user message.
            const session = await prismaForMock.chatSession.findUnique({ where: { sessionId } });
            await prismaForMock.message.create({
                data: {
                    sessionId,
                    userId: session.userId,
                    messageType: 'USER',
                    chatbotType,
                    content: text,
                },
            });
            return { text: mockState.responseText };
        }),
    };
});
// ─────────────────────────────────────────────────────────────────────────────

import app from '../../src/app.js';

const prisma = new PrismaClient();

const executeRequest = async (options) => {
    const req = createRequest(options);
    const res = createResponse({ eventEmitter: EventEmitter });
    return new Promise((resolve, reject) => {
        res.on('end', () => resolve(res));
        res.on('error', reject);
        app.handle(req, res);
    });
};

// ─── Shared auth state ────────────────────────────────────────────────────────
let authToken = null;
const testUser = {
    email: `chat-initial-test-${Date.now()}@example.com`,
    password: 'Integration123!',
    name: 'Initial Mode Test',
    dateOfBirth: '1995-01-01',
    gender: 'female',
    educationLevel: 3,
    emergencyContacts: [{ name: 'EC', relation: 'Friend', contactInfo: '0911000000' }],
};

beforeAll(async () => {
    await executeRequest({ method: 'POST', url: '/api/auth/register', body: testUser });
    const loginRes = await executeRequest({
        method: 'POST',
        url: '/api/auth/login',
        body: { email: testUser.email, password: testUser.password },
    });
    authToken = loginRes._getJSONData().token;
});

afterAll(async () => {
    await prisma.$disconnect();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const createInitialSession = async () => {
    const res = await executeRequest({
        method: 'POST',
        url: '/api/chat/sessions',
        headers: { Authorization: `Bearer ${authToken}` },
        body: { chatbotType: 'INITIAL' },
    });
    return res._getJSONData().session;
};

const sendMessage = async (sessionId, message) =>
    executeRequest({
        method: 'POST',
        url: `/api/chat/sessions/${sessionId}/messages`,
        headers: { Authorization: `Bearer ${authToken}` },
        body: { message },
    });

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/chat/sessions — INITIAL session creation', () => {
    test('defaults title to 初談 when not provided', async () => {
        const session = await createInitialSession();
        expect(session.title).toBe('初談');
        expect(session.chatbotType).toBe('INITIAL');
    });
});

describe('POST /api/chat/sessions/:id/messages — INITIAL mode message flow', () => {
    test('response includes initialMode metadata on every INITIAL message', async () => {
        mockState.responseText = 'I hear you. What brings you here today?';
        const session = await createInitialSession();

        const res = await sendMessage(session.id, 'Hello');

        expect(res.statusCode).toBe(200);
        const data = res._getJSONData();
        expect(data).toHaveProperty('initialMode');
        expect(data.initialMode).toMatchObject({
            roundsUsed: 1,
            maxRounds: 5,
            sessionEnded: false,
            selectedMode: null,
        });
    });

    test('reply does not contain the hidden mode marker', async () => {
        mockState.responseText = 'Let me understand you better.\n<<SELECTED_MODE:CBT>>';
        const session = await createInitialSession();

        const res = await sendMessage(session.id, 'I feel anxious a lot');

        const { reply } = res._getJSONData();
        expect(reply).not.toContain('<<SELECTED_MODE:');
        expect(reply).toBe('Let me understand you better.');
    });

    test('session ends and selectedMode is set when AI signals CBT', async () => {
        mockState.responseText = 'It sounds like CBT could really help.\n<<SELECTED_MODE:CBT>>';
        const session = await createInitialSession();

        const res = await sendMessage(session.id, 'I have a lot of negative thoughts');

        expect(res.statusCode).toBe(200);
        const { initialMode } = res._getJSONData();
        expect(initialMode.selectedMode).toBe('CBT');
        expect(initialMode.sessionEnded).toBe(true);

        // Verify DB: session is now inactive
        const dbSession = await prisma.chatSession.findFirst({ where: { id: session.id } });
        expect(dbSession.isActive).toBe(false);
    });

    test('session ends and selectedMode is set when AI signals MBT', async () => {
        mockState.responseText = 'MBT might suit you.\n<<SELECTED_MODE:MBT>>';
        const session = await createInitialSession();

        const res = await sendMessage(session.id, 'I struggle to understand my emotions');

        const { initialMode } = res._getJSONData();
        expect(initialMode.selectedMode).toBe('MBT');
        expect(initialMode.sessionEnded).toBe(true);
    });

    test('session ends and selectedMode is set when AI signals MBCT', async () => {
        mockState.responseText = 'MBCT would be a good fit.\n<<SELECTED_MODE:MBCT>>';
        const session = await createInitialSession();

        const res = await sendMessage(session.id, 'I keep ruminating on the same thoughts');

        const { initialMode } = res._getJSONData();
        expect(initialMode.selectedMode).toBe('MBCT');
        expect(initialMode.sessionEnded).toBe(true);
    });

    test('session ends and selectedMode is set when AI signals DBT (marker stripped, DB inactive)', async () => {
        mockState.responseText = 'DBT skills could help you here.\n<<SELECTED_MODE:DBT>>';
        const session = await createInitialSession();

        const res = await sendMessage(session.id, 'My emotions feel out of control');

        expect(res.statusCode).toBe(200);
        const data = res._getJSONData();

        // Marker is stripped from the user-visible reply
        expect(data.reply).not.toContain('<<SELECTED_MODE:');
        expect(data.reply).toBe('DBT skills could help you here.');

        // initialMode reports DBT and ends the session
        expect(data.initialMode.selectedMode).toBe('DBT');
        expect(data.initialMode.sessionEnded).toBe(true);

        // DB state: session row is now inactive
        const dbSession = await prisma.chatSession.findFirst({ where: { id: session.id } });
        expect(dbSession.isActive).toBe(false);
    });

    test('session auto-ends with selectedMode null when max rounds are exhausted', async () => {
        mockState.responseText = 'Tell me more.';
        const session = await createInitialSession();

        // Send rounds 1–4 (no marker, session stays open)
        for (let i = 0; i < 4; i++) {
            const res = await sendMessage(session.id, `Message ${i + 1}`);
            expect(res._getJSONData().initialMode.sessionEnded).toBe(false);
        }

        // Round 5: max rounds reached, session must end
        const finalRes = await sendMessage(session.id, 'Message 5');
        expect(finalRes.statusCode).toBe(200);

        const { initialMode } = finalRes._getJSONData();
        expect(initialMode.roundsUsed).toBe(5);
        expect(initialMode.sessionEnded).toBe(true);
        expect(initialMode.selectedMode).toBeNull();

        const dbSession = await prisma.chatSession.findFirst({ where: { id: session.id } });
        expect(dbSession.isActive).toBe(false);
    });

    test('ended session returns 404 on subsequent messages', async () => {
        mockState.responseText = 'CBT is a great choice.\n<<SELECTED_MODE:CBT>>';
        const session = await createInitialSession();

        // This message ends the session
        await sendMessage(session.id, 'I think CBT sounds right');

        // Further message on the now-ended session
        mockState.responseText = 'Should not reach the AI.';
        const res = await sendMessage(session.id, 'Another message');
        expect(res.statusCode).toBe(404);
    });

    test('round count increments correctly across multiple messages', async () => {
        mockState.responseText = 'I hear you.';
        const session = await createInitialSession();

        for (let round = 1; round <= 3; round++) {
            const res = await sendMessage(session.id, `Round ${round} message`);
            expect(res._getJSONData().initialMode.roundsUsed).toBe(round);
        }
    });
});

describe('POST /api/chat/sessions/:id/messages — non-INITIAL mode', () => {
    test('response does not include initialMode for CBT sessions', async () => {
        mockState.responseText = 'That sounds difficult.';
        const sessionRes = await executeRequest({
            method: 'POST',
            url: '/api/chat/sessions',
            headers: { Authorization: `Bearer ${authToken}` },
            body: { chatbotType: 'CBT' },
        });
        const session = sessionRes._getJSONData().session;

        const res = await sendMessage(session.id, 'Hello');

        expect(res.statusCode).toBe(200);
        const data = res._getJSONData();
        expect(data).not.toHaveProperty('initialMode');
        expect(data).toHaveProperty('reply');
    });

    test('authenticated DBT session is created with chatbotType=DBT', async () => {
        const res = await executeRequest({
            method: 'POST',
            url: '/api/chat/sessions',
            headers: { Authorization: `Bearer ${authToken}` },
            body: { chatbotType: 'DBT', title: 'DBT Session' },
        });

        expect(res.statusCode).toBe(201);
        const { session } = res._getJSONData();
        expect(session).toBeDefined();
        expect(session.chatbotType).toBe('DBT');
        expect(session.id).toBeDefined();

        // DB row exists with the same chatbotType
        const dbSession = await prisma.chatSession.findFirst({ where: { id: session.id } });
        expect(dbSession).not.toBeNull();
        expect(dbSession.chatbotType).toBe('DBT');
    });

    test('DBT session does not include initialMode metadata on messages', async () => {
        mockState.responseText = 'Let us practice a DBT skill.';
        const sessionRes = await executeRequest({
            method: 'POST',
            url: '/api/chat/sessions',
            headers: { Authorization: `Bearer ${authToken}` },
            body: { chatbotType: 'DBT' },
        });
        const session = sessionRes._getJSONData().session;

        const res = await sendMessage(session.id, 'I keep getting overwhelmed');

        expect(res.statusCode).toBe(200);
        const data = res._getJSONData();
        expect(data).not.toHaveProperty('initialMode');
        expect(data).toHaveProperty('reply');
    });
});
