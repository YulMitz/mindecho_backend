import { vi, describe, test, expect, beforeEach } from 'vitest';

// ─── Prisma mock ──────────────────────────────────────────────────────────────
const prismaStubs = vi.hoisted(() => ({
    chatSession: {
        create: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
    },
    message: {
        create: vi.fn(),
        count: vi.fn(),
        findMany: vi.fn(),
    },
}));

vi.mock('../../prisma-client/index.js', () => ({
    PrismaClient: vi.fn(() => prismaStubs),
}));

// ─── LLM mock ─────────────────────────────────────────────────────────────────
vi.mock('../../src/utils/llm.js', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual, // keep pure exports: parseInitialModeMarker, INITIAL_MAX_ROUNDS, storeResponse
        generateResponse: vi.fn(),
        storeResponse: vi.fn(),
    };
});

import {
    normalizeProvider,
    isValidChatbotType,
    createSession,
    listSessions,
    deleteSession,
    getMessages,
    getSessionRoundCount,
    sendMessage,
} from '../../src/services/chatService.js';
import { generateResponse, storeResponse } from '../../src/utils/llm.js';

beforeEach(() => {
    vi.clearAllMocks();
});

// ─── normalizeProvider ────────────────────────────────────────────────────────
describe('normalizeProvider', () => {
    test('returns GEMINI when provider is null or undefined', () => {
        expect(normalizeProvider(null)).toBe('GEMINI');
        expect(normalizeProvider(undefined)).toBe('GEMINI');
    });

    test('normalizes lowercase provider name to uppercase', () => {
        expect(normalizeProvider('gemini')).toBe('GEMINI');
        expect(normalizeProvider('anthropic')).toBe('ANTHROPIC');
    });

    test('returns null for an unrecognised provider', () => {
        expect(normalizeProvider('openai')).toBeNull();
        expect(normalizeProvider('azure')).toBeNull();
    });
});

// ─── isValidChatbotType ───────────────────────────────────────────────────────
describe('isValidChatbotType', () => {
    test.each(['CBT', 'MBT', 'MBCT', 'DBT', 'INITIAL'])('%s is valid', (type) => {
        expect(isValidChatbotType(type)).toBe(true);
    });

    test.each(['GPT', 'INVALID', '', null])('%s is not valid', (type) => {
        expect(isValidChatbotType(type)).toBe(false);
    });
});

// ─── createSession ────────────────────────────────────────────────────────────
describe('createSession', () => {
    const baseSession = { id: 's1', sessionId: 'sid-1', chatbotType: 'CBT', title: '新對話', provider: 'GEMINI', isActive: true };

    test('creates session and returns it', async () => {
        prismaStubs.chatSession.create.mockResolvedValue(baseSession);
        const result = await createSession('u1', 'CBT', undefined, 'GEMINI');
        expect(result).toStrictEqual(baseSession);
        expect(prismaStubs.chatSession.create).toHaveBeenCalledOnce();
    });

    test('defaults title to 初談 for INITIAL sessions', async () => {
        prismaStubs.chatSession.create.mockResolvedValue({ ...baseSession, chatbotType: 'INITIAL', title: '初談' });
        await createSession('u1', 'INITIAL', undefined, 'GEMINI');
        const callData = prismaStubs.chatSession.create.mock.calls[0][0].data;
        expect(callData.title).toBe('初談');
    });

    test('defaults title to 新對話 for non-INITIAL sessions', async () => {
        prismaStubs.chatSession.create.mockResolvedValue(baseSession);
        await createSession('u1', 'CBT', undefined, 'GEMINI');
        const callData = prismaStubs.chatSession.create.mock.calls[0][0].data;
        expect(callData.title).toBe('新對話');
    });

    test('uses provided title when given', async () => {
        prismaStubs.chatSession.create.mockResolvedValue({ ...baseSession, title: 'My Session' });
        await createSession('u1', 'CBT', 'My Session', 'GEMINI');
        const callData = prismaStubs.chatSession.create.mock.calls[0][0].data;
        expect(callData.title).toBe('My Session');
    });
});

// ─── listSessions ─────────────────────────────────────────────────────────────
describe('listSessions', () => {
    test('returns active sessions for user', async () => {
        const sessions = [{ id: 's1' }, { id: 's2' }];
        prismaStubs.chatSession.findMany.mockResolvedValue(sessions);
        const result = await listSessions('u1', 20, 0);
        expect(result).toStrictEqual(sessions);
        expect(prismaStubs.chatSession.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { userId: 'u1', isActive: true } })
        );
    });

    test('passes limit and offset to Prisma', async () => {
        prismaStubs.chatSession.findMany.mockResolvedValue([]);
        await listSessions('u1', 5, 10);
        expect(prismaStubs.chatSession.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ take: 5, skip: 10 })
        );
    });
});

// ─── deleteSession ────────────────────────────────────────────────────────────
describe('deleteSession', () => {
    test('returns null when session is not found', async () => {
        prismaStubs.chatSession.findFirst.mockResolvedValue(null);
        const result = await deleteSession('s1', 'u1');
        expect(result).toBeNull();
        expect(prismaStubs.chatSession.update).not.toHaveBeenCalled();
    });

    test('soft-deletes session by setting isActive false', async () => {
        const session = { id: 's1', userId: 'u1', isActive: true };
        prismaStubs.chatSession.findFirst.mockResolvedValue(session);
        prismaStubs.chatSession.update.mockResolvedValue({ ...session, isActive: false });
        const result = await deleteSession('s1', 'u1');
        expect(result).toStrictEqual(session);
        expect(prismaStubs.chatSession.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { isActive: false } })
        );
    });
});

// ─── getMessages ──────────────────────────────────────────────────────────────
describe('getMessages', () => {
    test('returns null when session is not found', async () => {
        prismaStubs.chatSession.findFirst.mockResolvedValue(null);
        const result = await getMessages('s1', 'u1', 50, null);
        expect(result).toBeNull();
    });

    test('returns messages in chronological order (reverses the desc DB result)', async () => {
        const session = { id: 's1', sessionId: 'sid-1' };
        // Prisma returns newest-first; service reverses to oldest-first
        prismaStubs.chatSession.findFirst.mockResolvedValue(session);
        prismaStubs.message.findMany.mockResolvedValue([{ id: 'm2' }, { id: 'm1' }]);
        const result = await getMessages('s1', 'u1', 50, null);
        expect(result).toStrictEqual([{ id: 'm1' }, { id: 'm2' }]);
    });

    test('applies before filter when provided', async () => {
        const session = { id: 's1', sessionId: 'sid-1' };
        prismaStubs.chatSession.findFirst.mockResolvedValue(session);
        prismaStubs.message.findMany.mockResolvedValue([]);
        const before = '2025-01-01T00:00:00Z';
        await getMessages('s1', 'u1', 50, before);
        const callWhere = prismaStubs.message.findMany.mock.calls[0][0].where;
        expect(callWhere).toHaveProperty('timestamp');
    });
});

// ─── getSessionRoundCount ─────────────────────────────────────────────────────
describe('getSessionRoundCount', () => {
    test('counts only USER messages for the session', async () => {
        prismaStubs.message.count.mockResolvedValue(3);
        const result = await getSessionRoundCount('sid-1');
        expect(result).toBe(3);
        expect(prismaStubs.message.count).toHaveBeenCalledWith({
            where: { sessionId: 'sid-1', messageType: 'USER' },
        });
    });
});

// ─── sendMessage ──────────────────────────────────────────────────────────────
describe('sendMessage', () => {
    const session = { id: 's1', sessionId: 'sid-1', userId: 'u1', chatbotType: 'CBT', provider: 'GEMINI', isActive: true };

    test('returns null when session is not found', async () => {
        prismaStubs.chatSession.findFirst.mockResolvedValue(null);
        const result = await sendMessage('s1', 'u1', 'hello');
        expect(result).toBeNull();
    });

    test('returns response for a non-INITIAL session (no initialMeta)', async () => {
        prismaStubs.chatSession.findFirst.mockResolvedValue(session);
        generateResponse.mockResolvedValue({ text: 'AI reply' });
        storeResponse.mockResolvedValue({ id: 'm1', timestamp: new Date() });

        const result = await sendMessage('s1', 'u1', 'hello');
        expect(result.response.text).toBe('AI reply');
        expect(result.initialMeta).toBeNull();
    });

    test('strips mode marker and sets initialMeta for INITIAL session', async () => {
        const initialSession = { ...session, chatbotType: 'INITIAL' };
        prismaStubs.chatSession.findFirst.mockResolvedValue(initialSession);
        prismaStubs.message.count.mockResolvedValue(1); // 1 USER message = round 1
        generateResponse.mockResolvedValue({ text: 'Good insight.\n<<SELECTED_MODE:CBT>>' });
        storeResponse.mockResolvedValue({ id: 'm1', timestamp: new Date() });
        prismaStubs.chatSession.findFirst
            .mockResolvedValueOnce(initialSession) // for the main sendMessage lookup
            .mockResolvedValue(initialSession); // for deleteSession's inner lookup

        const result = await sendMessage('s1', 'u1', 'I have negative thoughts');
        expect(result.response.text).toBe('Good insight.');
        expect(result.initialMeta.selectedMode).toBe('CBT');
        expect(result.initialMeta.sessionEnded).toBe(true);
        // storeResponse should receive clean text (marker stripped)
        const storedText = storeResponse.mock.calls[0][3].text;
        expect(storedText).toBe('Good insight.');
    });

    test('sets sessionEnded true when max rounds reached without mode selection', async () => {
        const initialSession = { ...session, chatbotType: 'INITIAL' };
        prismaStubs.chatSession.findFirst.mockResolvedValue(initialSession);
        prismaStubs.message.count.mockResolvedValue(5); // round 5 = max
        generateResponse.mockResolvedValue({ text: 'No marker here.' });
        storeResponse.mockResolvedValue({ id: 'm1', timestamp: new Date() });

        const result = await sendMessage('s1', 'u1', 'still chatting');
        expect(result.initialMeta.sessionEnded).toBe(true);
        expect(result.initialMeta.selectedMode).toBeNull();
        expect(result.initialMeta.roundsUsed).toBe(5);
    });

    test('sessionEnded is false when rounds < max and no mode marker', async () => {
        const initialSession = { ...session, chatbotType: 'INITIAL' };
        prismaStubs.chatSession.findFirst.mockResolvedValue(initialSession);
        prismaStubs.message.count.mockResolvedValue(2); // round 2, not at max yet
        generateResponse.mockResolvedValue({ text: 'Tell me more.' });
        storeResponse.mockResolvedValue({ id: 'm1', timestamp: new Date() });

        const result = await sendMessage('s1', 'u1', 'hello again');
        expect(result.initialMeta.sessionEnded).toBe(false);
        expect(result.initialMeta.roundsUsed).toBe(2);
    });
});
