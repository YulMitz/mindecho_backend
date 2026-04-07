import { vi, describe, test, expect, beforeEach } from 'vitest';

// ─── Prisma mock ──────────────────────────────────────────────────────────────
const prismaStubs = vi.hoisted(() => ({
    chatSession: {
        findUnique: vi.fn(),
        update: vi.fn(),
    },
    message: {
        count: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
    },
}));

vi.mock('../../prisma-client/index.js', () => ({
    PrismaClient: vi.fn(() => prismaStubs),
}));

// ─── Fetch mock (replaces SDK mocks) ────────────────────────────────────────
const fetchMock = vi.hoisted(() => ({
    responseText: 'Mock reply',
    responseUsage: { input_tokens: 10, output_tokens: 20 },
}));

vi.stubGlobal('fetch', vi.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
            text: fetchMock.responseText,
            usage: fetchMock.responseUsage,
        }),
    })
));

import { generateResponse, storeResponse } from '../../src/utils/llm.js';

// Base session fixture
const session = {
    id: 's1',
    sessionId: 'sid-1',
    userId: 'u1',
    chatbotType: 'CBT',
    provider: 'GEMINI',
    updatedAt: new Date(Date.now() - 5 * 60 * 1000), // 5 min ago (active)
};

beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.responseText = 'Mock reply';
    fetchMock.responseUsage = { input_tokens: 10, output_tokens: 20 };

    // Re-stub fetch after clearAllMocks
    global.fetch = vi.fn(() =>
        Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
                text: fetchMock.responseText,
                usage: fetchMock.responseUsage,
            }),
        })
    );
});

// ─── generateResponse ─────────────────────────────────────────────────────────
describe('generateResponse', () => {
    test('throws when session is not found', async () => {
        prismaStubs.chatSession.findUnique.mockResolvedValue(null);
        await expect(generateResponse('sid-1', 'CBT', 'hi', 'GEMINI')).rejects.toThrow('Session not found');
    });

    test('stores user message before calling inference service', async () => {
        prismaStubs.chatSession.findUnique.mockResolvedValue(session);
        prismaStubs.message.count.mockResolvedValue(2);
        prismaStubs.message.findMany.mockResolvedValue([]);
        prismaStubs.message.create.mockResolvedValue({ id: 'm1' });

        await generateResponse('sid-1', 'CBT', 'Hello', 'GEMINI');

        expect(prismaStubs.message.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    sessionId: 'sid-1',
                    messageType: 'USER',
                    content: 'Hello',
                }),
            })
        );
    });

    test('calls inference service with correct payload', async () => {
        prismaStubs.chatSession.findUnique.mockResolvedValue(session);
        prismaStubs.message.count.mockResolvedValue(0);
        prismaStubs.message.findMany.mockResolvedValue([]);
        prismaStubs.message.create.mockResolvedValue({ id: 'm1' });

        await generateResponse('sid-1', 'CBT', 'Hello', 'GEMINI');

        expect(global.fetch).toHaveBeenCalledTimes(1);
        const [url, options] = global.fetch.mock.calls[0];
        expect(url).toContain('/generate');
        const body = JSON.parse(options.body);
        expect(body.session_id).toBe('sid-1');
        expect(body.chatbot_type).toBe('CBT');
        expect(body.message).toBe('Hello');
        expect(body.provider).toBe('GEMINI');
    });

    test('returns response text from inference service', async () => {
        fetchMock.responseText = 'Therapy response';
        prismaStubs.chatSession.findUnique.mockResolvedValue(session);
        prismaStubs.message.count.mockResolvedValue(0);
        prismaStubs.message.findMany.mockResolvedValue([]);
        prismaStubs.message.create.mockResolvedValue({ id: 'm1' });

        const result = await generateResponse('sid-1', 'CBT', 'Hello', 'GEMINI');
        expect(result.text).toBe('Therapy response');
    });

    test('passes ANTHROPIC provider to inference service', async () => {
        prismaStubs.chatSession.findUnique.mockResolvedValue({ ...session, provider: 'ANTHROPIC' });
        prismaStubs.message.count.mockResolvedValue(0);
        prismaStubs.message.findMany.mockResolvedValue([]);
        prismaStubs.message.create.mockResolvedValue({ id: 'm1' });

        await generateResponse('sid-1', 'CBT', 'Hello', 'ANTHROPIC');

        const body = JSON.parse(global.fetch.mock.calls[0][1].body);
        expect(body.provider).toBe('ANTHROPIC');
    });

    test('loads full history for an active session', async () => {
        const recentSession = { ...session, updatedAt: new Date(Date.now() - 1 * 60 * 1000) };
        prismaStubs.chatSession.findUnique.mockResolvedValue(recentSession);
        prismaStubs.message.count.mockResolvedValue(10);
        prismaStubs.message.findMany.mockResolvedValue([]);
        prismaStubs.message.create.mockResolvedValue({ id: 'm1' });

        await generateResponse('sid-1', 'CBT', 'Hi', 'GEMINI');

        // findMany called for history (asc order) — not the desc/take:20 path
        const historyCall = prismaStubs.message.findMany.mock.calls[0][0];
        expect(historyCall.orderBy).toEqual({ timestamp: 'asc' });
        expect(historyCall.take).toBeUndefined();
    });

    test('loads only recent 20 messages for inactive session with many messages', async () => {
        const oldSession = { ...session, updatedAt: new Date(Date.now() - 20 * 60 * 1000) };
        prismaStubs.chatSession.findUnique.mockResolvedValue(oldSession);
        prismaStubs.message.count.mockResolvedValue(60); // > MAX_HISTORY_MESSAGES
        prismaStubs.message.findMany.mockResolvedValue([]);
        prismaStubs.message.create.mockResolvedValue({ id: 'm1' });

        await generateResponse('sid-1', 'CBT', 'Hi', 'GEMINI');

        // findMany called with desc + take:20
        const historyCall = prismaStubs.message.findMany.mock.calls[0][0];
        expect(historyCall.orderBy).toEqual({ timestamp: 'desc' });
        expect(historyCall.take).toBe(20);
    });

    test('sends prompt_options with currentRound for INITIAL mode', async () => {
        prismaStubs.chatSession.findUnique.mockResolvedValue({ ...session, chatbotType: 'INITIAL' });
        prismaStubs.message.count
            .mockResolvedValueOnce(0)  // general message count (history check)
            .mockResolvedValueOnce(4); // prior USER messages (INITIAL round calc)
        prismaStubs.message.findMany.mockResolvedValue([]);
        prismaStubs.message.create.mockResolvedValue({ id: 'm1' });

        await generateResponse('sid-1', 'INITIAL', 'Hello', 'GEMINI');

        const body = JSON.parse(global.fetch.mock.calls[0][1].body);
        expect(body.prompt_options.currentRound).toBe(5); // 4 prior + 1
        expect(body.prompt_options.maxRounds).toBe(5);
    });

    test('maps conversation history roles correctly', async () => {
        prismaStubs.chatSession.findUnique.mockResolvedValue(session);
        prismaStubs.message.count.mockResolvedValue(2);
        prismaStubs.message.findMany.mockResolvedValue([
            { messageType: 'USER', content: 'Hi' },
            { messageType: 'MODEL', content: 'Hello' },
        ]);
        prismaStubs.message.create.mockResolvedValue({ id: 'm1' });

        await generateResponse('sid-1', 'CBT', 'How are you?', 'GEMINI');

        const body = JSON.parse(global.fetch.mock.calls[0][1].body);
        expect(body.conversation_history).toEqual([
            { role: 'user', content: 'Hi' },
            { role: 'model', content: 'Hello' },
        ]);
    });

    test('throws on inference service error', async () => {
        global.fetch = vi.fn(() =>
            Promise.resolve({
                ok: false,
                status: 502,
                json: () => Promise.resolve({ detail: 'Provider error' }),
            })
        );

        prismaStubs.chatSession.findUnique.mockResolvedValue(session);
        prismaStubs.message.count.mockResolvedValue(0);
        prismaStubs.message.findMany.mockResolvedValue([]);
        prismaStubs.message.create.mockResolvedValue({ id: 'm1' });

        await expect(generateResponse('sid-1', 'CBT', 'hi', 'GEMINI')).rejects.toThrow('Provider error');
    });
});

// ─── storeResponse ────────────────────────────────────────────────────────────
describe('storeResponse', () => {
    test('creates a MODEL message in the DB', async () => {
        const storedMsg = { id: 'm1', messageType: 'MODEL' };
        prismaStubs.message.create.mockResolvedValue(storedMsg);
        prismaStubs.chatSession.update.mockResolvedValue({});

        const result = await storeResponse('sid-1', 'u1', 'CBT', { text: 'Hello!' }, 'GEMINI');

        expect(prismaStubs.message.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    sessionId: 'sid-1',
                    userId: 'u1',
                    messageType: 'MODEL',
                    chatbotType: 'CBT',
                    content: 'Hello!',
                }),
            })
        );
        expect(result).toStrictEqual(storedMsg);
    });

    test('updates chatSession updatedAt for activity tracking', async () => {
        prismaStubs.message.create.mockResolvedValue({ id: 'm1' });
        prismaStubs.chatSession.update.mockResolvedValue({});

        await storeResponse('sid-1', 'u1', 'CBT', { text: 'Hi' }, 'GEMINI');

        expect(prismaStubs.chatSession.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { sessionId: 'sid-1' },
                data: expect.objectContaining({ updatedAt: expect.any(Date) }),
            })
        );
    });

    test('defaults provider to GEMINI when not provided', async () => {
        prismaStubs.message.create.mockResolvedValue({ id: 'm1' });
        prismaStubs.chatSession.update.mockResolvedValue({});

        await storeResponse('sid-1', 'u1', 'CBT', { text: 'Hi' });

        const createData = prismaStubs.message.create.mock.calls[0][0].data;
        expect(createData.provider).toBe('GEMINI');
    });
});

// NOTE: getSystemPrompt tests moved to Python inference module (inference/src/prompts.py).
// The prompts are no longer in Node.js — they live in the Python service.
