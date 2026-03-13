import { PrismaClient } from '../../prisma-client/index.js';
import { generateResponse, storeResponse } from '../utils/llm.js';

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

    const storedMessage = await storeResponse(
        session.sessionId,
        session.userId,
        session.chatbotType,
        response,
        session.provider
    );

    return { response, storedMessage };
};

export const isValidChatbotType = (type) => validChatbotTypes.includes(type);
