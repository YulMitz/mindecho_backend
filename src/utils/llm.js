import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '../../prisma-client/index.js';

const prisma = new PrismaClient();

let genAIInstance = null;
let anthropicInstance = null;

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

// Lazily load Anthropic SDK
const getAnthropic = async () => {
    if (anthropicInstance) return anthropicInstance;

    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY is not set in environment variables');
    }

    anthropicInstance = new Anthropic({
        apiKey,
    });

    return anthropicInstance;
};

/* 
    Session definition configuration
    - Two confitions can determine if an user's chat session is active:
        - User is sending messages within time window.
        - If the topic that user is sending message to, have history length less than configuration.
*/
const ACTIVE_SESSION_WINDOW = 10 * 60 * 1000; // 10 minutes in milliseconds
const MAX_HISTORY_MESSAGES = 50;

export const generateResponse = async (sessionId, chatbotType, text, provider = 'GEMINI') => {
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

        let conversationHistory = [];

        // Load history based on conditions
        if (isActiveSession || messageCount < MAX_HISTORY_MESSAGES) {
            console.log(`Loading full history: ${isActiveSession ? 'active session' : 'message count not reach limit'} (${messageCount} messages)`);

            conversationHistory = await prisma.message.findMany({
                where: { sessionId },
                orderBy: { timestamp: 'asc' }
            });
        } else {
            console.log(`Session inactive and has ${messageCount} messages - using recent context only`);

            // Load only recent messages (last 20) for context
            const recentHistory = await prisma.message.findMany({
                where: { sessionId },
                orderBy: { timestamp: 'desc' },
                take: 20
            });

            conversationHistory = recentHistory.reverse(); // Restore chronological order
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

        // Generate response based on provider
        if (provider === 'ANTHROPIC') {
            return await generateAnthropicResponse(conversationHistory, chatbotType, text);
        } else {
            return await generateGeminiResponse(conversationHistory, chatbotType, text);
        }
    } catch (error) {
        console.error('Error generating response:', error);
        throw error;
    }
};

// Generate response using Gemini
const generateGeminiResponse = async (conversationHistory, chatbotType, text) => {
    const conversationContext = conversationHistory.map((message) => ({
        parts: [{ text: message.content }],
        role: message.messageType === 'USER' ? 'user' : 'model',
    }));

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

    const response = await chat.sendMessage({
        message: text,
    });

    return response;
};

// Generate response using Anthropic (Claude)
const generateAnthropicResponse = async (conversationHistory, chatbotType, text) => {
    const messages = conversationHistory.map((message) => ({
        role: message.messageType === 'USER' ? 'user' : 'assistant',
        content: message.content,
    }));

    // Add the current user message
    messages.push({
        role: 'user',
        content: text,
    });

    const anthropic = await getAnthropic();
    const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: getSystemPrompt(chatbotType),
        messages: messages,
    });

    // Return in a format compatible with Gemini response
    return {
        text: response.content[0].text,
        usage: response.usage,
    };
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
    response,
    provider = 'GEMINI'
) => {
    try {
        // Store the bot response
        const message = await prisma.message.create({
            data: {
                sessionId,
                userId,
                messageType: 'MODEL',
                chatbotType,
                provider,
                content: response.text,
            }
        });

        // Update session timestamp for activity tracking
        await prisma.chatSession.update({
            where: { sessionId },
            data: { updatedAt: new Date() }
        });

        console.log('Response stored successfully for session:', sessionId);
        return message;
    } catch (error) {
        console.error('Error storing response:', error);
        throw error;
    }
};

export default {
    generateResponse,
    storeResponse,
};
