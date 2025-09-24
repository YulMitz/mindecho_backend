import dotenv from 'dotenv';
dotenv.config();

import { GoogleGenAI } from '@google/genai';
import mongoose from 'mongoose';
import Message from '../models/Message.js';
import ChatSession from '../models/ChatSession.js';
import { v4 as uuidv4 } from 'uuid';

// Initialize Google GenAI with the API key from environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set in environment variables');
}

const genAI = new GoogleGenAI({
    vertexai: false,
    apiKey: GEMINI_API_KEY,
});

export const generateResponse = async (userId, chatbotType, text) => {
    try {
        // Retrieve the user's chat history
        const history = await Message.find({ userId: userId })
            .sort({ timestamp: -1 })
            .exec();

        console.log('Recent 5 chat history:', history.slice(0, 5));

        // Build conversation context for chat session
        const conversationContext = history.map((message) => ({
            parts: [{ text: message.content }],
            role: message.messageType === 'user' ? 'user' : 'model',
        }));

        // Create a new chat session for the user
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

        console.log('New chat session created:', chat);

        // Generate user message and save it to the database
        const userMessage = new Message({
            userId: userId,
            messageType: 'user',
            chatbotType: chatbotType,
            content: text,
            timestamp: new Date(),
        });

        await userMessage.save();

        // Generate a response in the chat session
        const response = await chat.sendMessage({
            message: text,
        });

        return response;
    } catch (error) {
        console.error('Error creating session:', error);
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
export const storeResponseAndMetadata = async (
    userId,
    chatbotType,
    response
) => {
    try {
        // Find active session metadata in the database
        const activeSession = await ChatSession.findOne({
            userId: userId,
            chatbotType: chatbotType,
        }).exec();

        if (activeSession) {
            // If an active session exists, update the timestamp
            activeSession.timestamp = new Date();
            await activeSession.save();
            console.log('Active chat session updated:', activeSession);
        } else {
            // Generate a unique session ID and chat session if no active session exists for the user
            const sessionId = uuidv4();

            const chatSession = new ChatSession({
                sessionId: sessionId,
                userId: userId,
                chatbotType: chatbotType,
                timestamp: new Date(),
            });

            await chatSession.save();
            console.log(
                'New chat session metadata saved to database:',
                chatSession
            );
        }

        // Store the response in the database
        const botMessage = new Message({
            userId: userId,
            messageType: 'model',
            chatbotType: chatbotType,
            content: response.text,
            timestamp: new Date(),
        });

        await botMessage.save();
        console.log('Response stored successfully:', botMessage);
    } catch (error) {
        console.error('Error storing response:', error);
        throw error;
    }
};

export default {
    generateResponse,
    storeResponseAndMetadata,
};
