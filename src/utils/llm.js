import dotenv from 'dotenv';
dotenv.config();

import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set in environment variables');
}

const genAI = new GoogleGenAI({apiKey: GEMINI_API_KEY});

export const generateResponse = async (userId, text) => {
    try {
        const response = await genAI.models.generateContent({
            model: 'gemini-2.0-flash-001',
            contents: text,
        });

        return response;
    } catch (error) {
        return error;
    }
}

export default {
    generateResponse
};