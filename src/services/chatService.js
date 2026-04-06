import { PrismaClient } from '../../prisma-client/index.js';
import { generateResponse, storeResponse, parseInitialModeMarker, INITIAL_MAX_ROUNDS } from '../utils/llm.js';

const prisma = new PrismaClient();

const validChatbotTypes = ['MBT', 'CBT', 'MBCT', 'INITIAL'];
const validProviders = ['GEMINI', 'ANTHROPIC'];

export const normalizeProvider = (provider) => {
    if (!provider) return 'GEMINI';
    const upper = provider.toUpperCase();
    return validProviders.includes(upper) ? upper : null;
};

export const createSession = async (userId, chatbotType, title, provider) => {
    const resolvedTitle =
        chatbotType === 'INITIAL'
            ? (typeof title === 'string' && title.trim() ? title.trim() : '初談')
            : (typeof title === 'string' && title.trim() ? title.trim() : '新對話');

    const session = await prisma.chatSession.create({
        data: {
            userId,
            chatbotType,
            title: resolvedTitle,
            provider,
        },
    });

    return session;
};

export const listSessions = async (userId, limit, offset) => {
    return prisma.chatSession.findMany({
        where: { userId, isActive: true },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
    });
};

export const deleteSession = async (sessionId, userId) => {
    const session = await prisma.chatSession.findFirst({
        where: { id: sessionId, userId, isActive: true },
    });

    if (!session) return null;

    await prisma.chatSession.update({
        where: { id: session.id },
        data: { isActive: false },
    });

    return session;
};

export const getMessages = async (sessionId, userId, limit, before) => {
    const session = await prisma.chatSession.findFirst({
        where: { id: sessionId, userId },
    });

    if (!session) return null;

    const messages = await prisma.message.findMany({
        where: {
            sessionId: session.sessionId,
            ...(before ? { timestamp: { lt: new Date(before) } } : {}),
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
    });

    return messages.reverse();
};

export const getSessionRoundCount = async (sessionId) => {
    return prisma.message.count({
        where: { sessionId, messageType: 'USER' },
    });
};

export const sendMessage = async (sessionId, userId, message) => {
    const session = await prisma.chatSession.findFirst({
        where: { id: sessionId, userId, isActive: true },
    });

    if (!session) return null;

    const response = await generateResponse(
        session.sessionId,
        session.chatbotType,
        message,
        session.provider
    );

    // For INITIAL mode: strip the hidden mode marker before storing and returning,
    // then check whether the session should be ended.
    let initialMeta = null;
    const responseToStore = session.chatbotType === 'INITIAL'
        ? (() => {
            const { cleanText, selectedMode } = parseInitialModeMarker(response.text);
            initialMeta = { selectedMode }; // roundsUsed filled in below
            return { ...response, text: cleanText };
        })()
        : response;

    const storedMessage = await storeResponse(
        session.sessionId,
        session.userId,
        session.chatbotType,
        responseToStore,
        session.provider
    );

    if (session.chatbotType === 'INITIAL') {
        // Count rounds after user message was stored (inside generateResponse)
        const roundsUsed = await getSessionRoundCount(session.sessionId);
        const sessionEnded = initialMeta.selectedMode !== null || roundsUsed >= INITIAL_MAX_ROUNDS;

        if (sessionEnded) {
            await deleteSession(session.id, userId);
        }

        initialMeta = { roundsUsed, maxRounds: INITIAL_MAX_ROUNDS, sessionEnded, selectedMode: initialMeta.selectedMode };
    }

    return { response: responseToStore, storedMessage, initialMeta };
};

export const isValidChatbotType = (type) => validChatbotTypes.includes(type);
