import { generateResponse, storeResponse } from '../utils/llm.js';
import { PrismaClient } from '../../prisma-client/index.js';

const prisma = new PrismaClient();

const modeToChatbotType = (mode) => {
    if (!mode || mode === 'chatMode' || mode === 'normal') return 'DEFAULT';
    if (mode === 'CBT' || mode === 'MBT') return mode;
    return null;
};

const chatbotTypeToMode = (chatbotType) => {
    if (chatbotType === 'DEFAULT') return 'chatMode';
    return chatbotType;
};

/*
    Create a new chat topic for the user
    - A topic is actively created in the frontend via "Create Topic" button.
*/
export const createChatTopic = async (req, res) => {
    try {
        const { userId, title, chatbotType = 'DEFAULT' } = req.body;

        const topic = await prisma.chatTopic.create({
            data: {
                title,
                userId,
                chatbotType,
            }
        });

        // Create initial session for the topic
        const session = await prisma.chatSession.create({
            data: {
                topicId: topic.id,
                userId,
                chatbotType,
            }
        });

        res.json({
            message: 'Topic created successfully',
            topic,
            sessionId: session.sessionId
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

/*
    Create a new chat session (REST-style)
*/
export const createChatSession = async (req, res) => {
    try {
        const { mode, title } = req.body;
        const chatbotType = modeToChatbotType(mode);

        if (!chatbotType) {
            console.warn('createChatSession: invalid mode', { mode });
            return res.status(400).json({ message: 'Invalid mode.' });
        }

        const resolvedTitle =
            typeof title === 'string' && title.trim()
                ? title.trim()
                : '新對話';

        const userId = req.user?.userId;
        if (!userId) {
            console.warn('createChatSession: missing userId');
            return res.status(400).json({ message: 'Missing userId.' });
        }

        const topic = await prisma.chatTopic.create({
            data: {
                title: resolvedTitle,
                userId,
                chatbotType,
            },
        });

        const session = await prisma.chatSession.create({
            data: {
                topicId: topic.id,
                userId,
                chatbotType,
            },
        });

        res.status(201).json({
            session: {
                id: session.id,
                title: topic.title,
                mode: chatbotTypeToMode(session.chatbotType),
                createdAt: session.createdAt,
            },
        });
    } catch (error) {
        console.error('createChatSession error:', error);
        res.status(400).json({ message: error.message });
    }
};

/*
    List chat sessions (REST-style)
*/
export const listChatSessions = async (req, res) => {
    try {
        const limit = Number(req.query.limit) || 20;
        const offset = Number(req.query.offset) || 0;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(400).json({ message: 'Missing userId.' });
        }

        const sessions = await prisma.chatSession.findMany({
            where: {
                userId,
                isActive: true,
            },
            include: {
                topic: true,
            },
            orderBy: { updatedAt: 'desc' },
            take: limit,
            skip: offset,
        });

        res.status(200).json({
            sessions: sessions.map((session) => ({
                id: session.id,
                title: session.topic?.title || '新對話',
                mode: chatbotTypeToMode(session.chatbotType),
                createdAt: session.createdAt,
            })),
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

/*
    Send a message to a session (REST-style)
*/
export const sendSessionMessage = async (req, res) => {
    try {
        const { message, mode } = req.body;
        const userId = req.user?.userId;

        if (!userId) {
            console.warn('sendSessionMessage: missing userId');
            return res.status(400).json({ message: 'Missing userId.' });
        }

        if (!message) {
            console.warn('sendSessionMessage: missing message');
            return res.status(400).json({ message: 'Missing message.' });
        }

        const session = await prisma.chatSession.findFirst({
            where: {
                id: req.params.id,
                userId,
                isActive: true,
            },
        });

        if (!session) {
            console.warn('sendSessionMessage: session not found', {
                sessionId: req.params.id,
                userId,
            });
            return res.status(404).json({ message: 'Session not found.' });
        }

        if (mode) {
            const chatbotType = modeToChatbotType(mode);
            if (!chatbotType || chatbotType !== session.chatbotType) {
                console.warn('sendSessionMessage: mode mismatch', {
                    mode,
                    sessionMode: session.chatbotType,
                });
                return res.status(400).json({ message: 'Mode mismatch.' });
            }
        }

        const response = await generateResponse(
            session.sessionId,
            session.chatbotType,
            message
        );

        const storedMessage = await storeResponse(
            session.sessionId,
            session.userId,
            session.chatbotType,
            response
        );

        res.status(200).json({
            reply: response.text,
            messageId: storedMessage?.id || null,
            timestamp: storedMessage?.timestamp || new Date().toISOString(),
        });
    } catch (error) {
        console.error('sendSessionMessage error:', error);
        res.status(400).json({ message: error.message });
    }
};

/*
    Get session messages (REST-style)
*/
export const getSessionMessages = async (req, res) => {
    try {
        const limit = Number(req.query.limit) || 50;
        const before = req.query.before;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(400).json({ message: 'Missing userId.' });
        }

        const session = await prisma.chatSession.findFirst({
            where: {
                id: req.params.id,
                userId,
            },
        });

        if (!session) {
            return res.status(404).json({ message: 'Session not found.' });
        }

        const messages = await prisma.message.findMany({
            where: {
                sessionId: session.sessionId,
                ...(before ? { timestamp: { lt: new Date(before) } } : {}),
            },
            orderBy: { timestamp: 'desc' },
            take: limit,
        });

        res.status(200).json({
            messages: messages
                .reverse()
                .map((message) => ({
                    id: message.id,
                    content: message.content,
                    isFromUser: message.messageType === 'USER',
                    timestamp: message.timestamp,
                    mode: chatbotTypeToMode(message.chatbotType),
                })),
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

/*
    Delete or archive a session (REST-style)
*/
export const deleteChatSession = async (req, res) => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(400).json({ message: 'Missing userId.' });
        }

        const session = await prisma.chatSession.findFirst({
            where: {
                id: req.params.id,
                userId,
                isActive: true,
            },
        });

        if (!session) {
            return res.status(404).json({ message: 'Session not found.' });
        }

        await prisma.chatSession.update({
            where: { id: session.id },
            data: { isActive: false },
        });

        res.status(200).json({
            message: 'Session deleted successfully',
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

/*
    Send a message in a specific session
*/
export const sendMessage = async (req, res, next) => {
    try {
        const { sessionId, text } = req.body;

        // Get session info
        const session = await prisma.chatSession.findUnique({
            where: { sessionId },
            include: { topic: true }
        });

        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }

        // Generate response using LLM
        const response = await generateResponse(sessionId, session.chatbotType, text);

        // Store the response in the req for next middleware
        req.sessionId = sessionId;
        req.userMessage = text;
        req.response = response;
        req.userId = session.userId;
        req.chatbotType = session.chatbotType;

        next();
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

/*
    Get user's chat topics
*/
export const getUserTopics = async (req, res) => {
    try {
        const { userId } = req.params;

        const topics = await prisma.chatTopic.findMany({
            where: {
                userId,
                isActive: true
            },
            include: {
                sessions: {
                    where: { isActive: true },
                    orderBy: { updatedAt: 'desc' },
                    take: 1
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        res.json({ topics });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

/*
    Get chat history for a session
*/
export const getSessionHistory = async (req, res) => {
    try {
        const { sessionId } = req.params;

        const messages = await prisma.message.findMany({
            where: { sessionId },
            orderBy: { timestamp: 'asc' }
        });

        res.json({ messages });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

/*
    Middleware function after sending a message
*/
export const handleResponse = async (req, res) => {
    try {
        const { sessionId, userId, userMessage, chatbotType, response } = req;

        await storeResponse(sessionId, userId, chatbotType, response);

        // Update session timestamp
        await prisma.chatSession.update({
            where: { sessionId },
            data: { updatedAt: new Date() }
        });

        res.json({
            message: 'Message sent successfully',
            userMessage: userMessage,
            response: response.text,
            timeSent: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Error in handleResponse:', error);
        res.status(500).json({ message: error.message });
    }
};

/*
    Retrieve chat history for a user
*/
export const getChatHistory = async (req, res) => {
    try {
    } catch (error) {
        res.status(400).json({ message: error.message });
        return;
    }
};

export default {
    createChatTopic,
    createChatSession,
    listChatSessions,
    sendSessionMessage,
    getSessionMessages,
    deleteChatSession,
    sendMessage,
    getUserTopics,
    getSessionHistory,
    handleResponse,
};
