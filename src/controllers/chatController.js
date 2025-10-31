import { generateResponse, storeResponse } from '../utils/llm.js';
import { PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient();

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
    sendMessage,
    getUserTopics,
    getSessionHistory,
    handleResponse,
};
