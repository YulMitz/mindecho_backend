import {
    createSession,
    listSessions,
    deleteSession,
    getMessages,
    sendMessage,
    normalizeProvider,
    isValidChatbotType,
} from '../services/chatService.js';

/*
    Create a new chat session.
    Body: { chatbotType, title?, provider? }
    chatbotType: 'MBT' | 'CBT' | 'MBCT' | 'DBT' | 'INITIAL'
    INITIAL is used when a user opens the chat interface for the first time (初談).
*/
export const createChatSession = async (req, res) => {
    try {
        const { chatbotType, title, provider } = req.body;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(400).json({ message: 'Missing userId.' });
        }

        if (!isValidChatbotType(chatbotType)) {
            return res.status(400).json({ message: 'Invalid chatbotType. Use MBT, CBT, MBCT, DBT, or INITIAL.' });
        }

        const llmProvider = normalizeProvider(provider);
        if (!llmProvider) {
            return res.status(400).json({ message: 'Invalid provider. Use "gemini" or "anthropic".' });
        }

        const session = await createSession(userId, chatbotType, title, llmProvider);

        res.status(201).json({
            session: {
                id: session.id,
                title: session.title,
                chatbotType: session.chatbotType,
                provider: session.provider.toLowerCase(),
                createdAt: session.createdAt,
            },
        });
    } catch (error) {
        console.error('createChatSession error:', error);
        res.status(400).json({ message: error.message });
    }
};

/*
    List active sessions for the authenticated user.
*/
export const listChatSessions = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(400).json({ message: 'Missing userId.' });
        }

        const limit = Number(req.query.limit) || 20;
        const offset = Number(req.query.offset) || 0;

        const sessions = await listSessions(userId, limit, offset);

        res.status(200).json({
            sessions: sessions.map((session) => ({
                id: session.id,
                title: session.title,
                chatbotType: session.chatbotType,
                provider: session.provider.toLowerCase(),
                createdAt: session.createdAt,
            })),
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

/*
    Send a message to a session and receive an AI reply.
    Body: { message }
*/
export const sendSessionMessage = async (req, res) => {
    try {
        const { message } = req.body;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(400).json({ message: 'Missing userId.' });
        }

        if (!message) {
            return res.status(400).json({ message: 'Missing message.' });
        }

        const result = await sendMessage(req.params.id, userId, message);

        if (!result) {
            return res.status(404).json({ message: 'Session not found.' });
        }

        const responseBody = {
            reply: result.response.text,
            messageId: result.storedMessage?.id || null,
            timestamp: result.storedMessage?.timestamp || new Date().toISOString(),
        };

        if (result.initialMeta) {
            responseBody.initialMode = result.initialMeta;
        }

        res.status(200).json(responseBody);
    } catch (error) {
        console.error('sendSessionMessage error:', error);
        const statusCode = error?.status === 429 ? 429 : 400;
        res.status(statusCode).json({ message: error.message });
    }
};

/*
    Get paginated message history for a session.
    Query: ?limit&before
*/
export const getSessionMessages = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(400).json({ message: 'Missing userId.' });
        }

        const limit = Number(req.query.limit) || 50;
        const before = req.query.before;

        const messages = await getMessages(req.params.id, userId, limit, before);

        if (!messages) {
            return res.status(404).json({ message: 'Session not found.' });
        }

        res.status(200).json({
            messages: messages.map((message) => ({
                id: message.id,
                content: message.content,
                isFromUser: message.messageType === 'USER',
                chatbotType: message.chatbotType,
                timestamp: message.timestamp,
            })),
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

/*
    Soft-delete a session.
*/
export const deleteChatSession = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(400).json({ message: 'Missing userId.' });
        }

        const session = await deleteSession(req.params.id, userId);

        if (!session) {
            return res.status(404).json({ message: 'Session not found.' });
        }

        res.status(200).json({ message: 'Session deleted successfully.' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export default {
    createChatSession,
    listChatSessions,
    sendSessionMessage,
    getSessionMessages,
    deleteChatSession,
};
