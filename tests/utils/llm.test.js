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

// ─── Gemini SDK mock ──────────────────────────────────────────────────────────
// Controls the Gemini response text per test.
const geminiMock = vi.hoisted(() => ({ responseText: 'Gemini reply' }));

vi.mock('@google/genai', () => ({
    GoogleGenAI: vi.fn(() => ({
        chats: {
            create: vi.fn().mockImplementation(() => ({
                sendMessage: vi.fn().mockImplementation(() => ({ text: geminiMock.responseText })),
            })),
        },
    })),
}));

// ─── Anthropic SDK mock ───────────────────────────────────────────────────────
const anthropicMock = vi.hoisted(() => ({ responseText: 'Anthropic reply' }));

vi.mock('@anthropic-ai/sdk', () => ({
    default: vi.fn(() => ({
        messages: {
            create: vi.fn().mockImplementation(() => ({
                content: [{ text: anthropicMock.responseText }],
                usage: { input_tokens: 10, output_tokens: 20 },
            })),
        },
    })),
}));

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
    // Reset mock response text to defaults
    geminiMock.responseText = 'Gemini reply';
    anthropicMock.responseText = 'Anthropic reply';
});

// ─── generateResponse ─────────────────────────────────────────────────────────
describe('generateResponse', () => {
    test('throws when session is not found', async () => {
        prismaStubs.chatSession.findUnique.mockResolvedValue(null);
        await expect(generateResponse('sid-1', 'CBT', 'hi', 'GEMINI')).rejects.toThrow('Session not found');
    });

    test('stores user message before calling LLM', async () => {
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

    test('returns Gemini response text for GEMINI provider', async () => {
        geminiMock.responseText = 'Gemini says hi';
        prismaStubs.chatSession.findUnique.mockResolvedValue(session);
        prismaStubs.message.count.mockResolvedValue(0);
        prismaStubs.message.findMany.mockResolvedValue([]);
        prismaStubs.message.create.mockResolvedValue({ id: 'm1' });

        const result = await generateResponse('sid-1', 'CBT', 'Hello', 'GEMINI');
        expect(result.text).toBe('Gemini says hi');
    });

    test('returns Anthropic response text for ANTHROPIC provider', async () => {
        anthropicMock.responseText = 'Anthropic says hi';
        prismaStubs.chatSession.findUnique.mockResolvedValue({ ...session, provider: 'ANTHROPIC' });
        prismaStubs.message.count.mockResolvedValue(0);
        prismaStubs.message.findMany.mockResolvedValue([]);
        prismaStubs.message.create.mockResolvedValue({ id: 'm1' });

        const result = await generateResponse('sid-1', 'CBT', 'Hello', 'ANTHROPIC');
        expect(result.text).toBe('Anthropic says hi');
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

    test('injects currentRound into prompt options for INITIAL mode', async () => {
        prismaStubs.chatSession.findUnique.mockResolvedValue({ ...session, chatbotType: 'INITIAL' });
        prismaStubs.message.count.mockResolvedValueOnce(4)  // prior USER messages (for round calc)
                                  .mockResolvedValue(0);    // full message count for history check
        prismaStubs.message.findMany.mockResolvedValue([]);
        prismaStubs.message.create.mockResolvedValue({ id: 'm1' });

        // If round injection works, the Gemini chat will be created with a system instruction
        // that contains '[Round 5 of 5]' (4 prior + 1 current = round 5).
        // We verify no error is thrown and the response is returned.
        const result = await generateResponse('sid-1', 'INITIAL', 'Hello', 'GEMINI');
        expect(result).toBeDefined();
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

// ─── getSystemPrompt — non-INITIAL modes ─────────────────────────────────────
// (INITIAL mode is extensively tested in initial-mode.unit.test.js)
import { getSystemPrompt } from '../../src/utils/llm.js';

describe('getSystemPrompt — CBT, MBT, MBCT', () => {
    test('CBT prompt contains CBT-specific guidance', () => {
        const prompt = getSystemPrompt('CBT');
        expect(prompt).toContain('Cognitive Behavioral Therapy');
        expect(prompt).toContain('thoughts, feelings, and behaviors');
    });

    test('MBT prompt contains MBT-specific guidance', () => {
        const prompt = getSystemPrompt('MBT');
        expect(prompt).toContain('Mentalization-Based Therapy');
        expect(prompt).toContain('inner world');
    });

    test('MBCT prompt contains MBCT-specific guidance', () => {
        const prompt = getSystemPrompt('MBCT');
        expect(prompt).toContain('Mindfulness-Based Cognitive Therapy');
        expect(prompt).toContain('rumination');
    });

    test('unknown type returns only the base prompt', () => {
        const base = getSystemPrompt('UNKNOWN');
        const cbt = getSystemPrompt('CBT');
        expect(base.length).toBeLessThan(cbt.length);
        expect(base).toContain('繁體中文');
    });

    test('all prompts include the base therapist character content', () => {
        for (const type of ['CBT', 'MBT', 'MBCT', 'INITIAL']) {
            expect(getSystemPrompt(type)).toContain('unconditional positive regard');
        }
    });
});
