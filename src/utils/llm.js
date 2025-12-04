import dotenv from 'dotenv';
dotenv.config();

import { GoogleGenAI } from '@google/genai';
import { PrismaClient } from '../../prisma-client/index.js';

const prisma = new PrismaClient();

let genAIInstance = null;

// Lazily load Google GenAI so the SDK initializes only when first used
const getGenAI = async () => {
    if (genAIInstance) return genAIInstance;

    const { GoogleGenAI } = await import('@google/genai');
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not set in environment variables');
    }

    genAIInstance = new GoogleGenAI({
        vertexai: false,
        apiKey,
    });

    return genAIInstance;
};

/* 
    Session definition configuration
    - Two confitions can determine if an user's chat session is active:
        - User is sending messages within time window.
        - If the topic that user is sending message to, have history length less than configuration.
*/
const ACTIVE_SESSION_WINDOW = 10 * 60 * 1000; // 10 minutes in milliseconds
const MAX_HISTORY_MESSAGES = 50;

export const generateResponse = async (sessionId, chatbotType, text) => {
    try {
        // Get session info to check last activity
        const session = await prisma.chatSession.findUnique({
            where: { sessionId }
        });

        if (!session) {
            throw new Error('Session not found');
        }

        const now = new Date();
        const lastActivity = new Date(session.updatedAt);
        const timeSinceLastActivity = now - lastActivity;

        // Check if user is actively chatting (within time window)
        const isActiveSession = timeSinceLastActivity <= ACTIVE_SESSION_WINDOW;

        // Get message count for the session
        const messageCount = await prisma.message.count({
            where: { sessionId }
        });

        let conversationContext = [];

        // Load history based on conditions
        if (isActiveSession || messageCount < MAX_HISTORY_MESSAGES) {
            console.log(`Loading full history: ${isActiveSession ? 'active session' : 'message count not reach limit'} (${messageCount} messages)`);

            const history = await prisma.message.findMany({
                where: { sessionId },
                orderBy: { timestamp: 'asc' }
            });

            conversationContext = history.map((message) => ({
                parts: [{ text: message.content }],
                role: message.messageType === 'USER' ? 'user' : 'model',
            }));
        } else {
            console.log(`Session inactive and has ${messageCount} messages - using recent context only`);

            // Load only recent messages (last 20) for context
            const recentHistory = await prisma.message.findMany({
                where: { sessionId },
                orderBy: { timestamp: 'desc' },
                take: 20
            });

            conversationContext = recentHistory
                .reverse() // Restore chronological order
                .map((message) => ({
                    parts: [{ text: message.content }],
                    role: message.messageType === 'USER' ? 'user' : 'model',
                }));
        }

        // Store user message first
        await prisma.message.create({
            data: {
                sessionId,
                userId: session.userId,
                messageType: 'USER',
                chatbotType,
                content: text,
            }
        });

        // Create chat session with appropriate history
        const genAI = await getGenAI();
        const chat = await genAI.chats.create({
            model: 'gemini-2.0-flash',
            config: {
                maxTokens: 1000,
                temperature: 0.7,
                topP: 0.9,
                systemInstruction: {
                    parts: [{ text: getSystemPrompt(chatbotType) }],
                    role: 'system',
                },
            },
            history: conversationContext,
        });

        // Generate response
        const response = await chat.sendMessage({
            message: text,
        });

        return response;
    } catch (error) {
        console.error('Error generating response:', error);
        throw error;
    }
};

/*
    Get system prompt for the chatbot
*/
const getSystemPrompt = (chatbotType) => {
    switch (chatbotType) {
        case 'CBT':
            return 'You are a cognitive behavioral therapy assistant. Help users identify and challenge negative thought patterns using CBT techniques.';
        case 'MBT':
            return 'You are a mindfulness-based therapy assistant. Guide users through mindfulness practices and help them develop present-moment awareness.';
        default:
            return 'You are a helpful and empathetic AI assistant. Provide supportive and thoughtful responses.';
    }
};

/*
    Handle metadata and response storage after sending a message
*/
export const storeResponse = async (
    sessionId, 
    userId, 
    chatbotType, 
    response
) => {
    try {
        // Store the bot response
        await prisma.message.create({
            data: {
                sessionId,
                userId,
                messageType: 'MODEL',
                chatbotType,
                content: response.text,
            }
        });

        // Update session timestamp for activity tracking
        await prisma.chatSession.update({
            where: { sessionId },
            data: { updatedAt: new Date() }
        });

        console.log('Response stored successfully for session:', sessionId);
    } catch (error) {
        console.error('Error storing response:', error);
        throw error;
    }
};

export default {
    generateResponse,
    storeResponse,
};
