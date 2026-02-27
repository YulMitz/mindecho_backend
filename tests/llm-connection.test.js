/**
 * LLM API Connection Health Check Tests
 *
 * These tests verify that the LLM API endpoints (Gemini and Claude) are
 * properly configured and accessible. Run these tests to ensure your
 * API keys are valid and the services are operational.
 *
 * Usage:
 *   npm run test:llm          # Run LLM connection tests
 *   npm run test -- tests/llm-connection.test.js
 */

import { describe, expect, test, beforeAll } from 'vitest';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Test configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

describe('LLM API Connection Health Checks', () => {
    describe('Environment Variables', () => {
        test('GEMINI_API_KEY should be defined', () => {
            expect(GEMINI_API_KEY).toBeDefined();
            expect(GEMINI_API_KEY).not.toBe('');
            expect(GEMINI_API_KEY).not.toBe('fake-test-key');
        });

        test('ANTHROPIC_API_KEY should be defined', () => {
            expect(ANTHROPIC_API_KEY).toBeDefined();
            expect(ANTHROPIC_API_KEY).not.toBe('');
        });

        test('GEMINI_API_KEY format should be valid', () => {
            // Gemini API keys typically start with 'AI' and are ~39 chars
            if (GEMINI_API_KEY && GEMINI_API_KEY !== 'fake-test-key') {
                expect(GEMINI_API_KEY.length).toBeGreaterThan(30);
            }
        });

        test('ANTHROPIC_API_KEY format should be valid', () => {
            // Anthropic API keys typically start with 'sk-ant-'
            if (ANTHROPIC_API_KEY) {
                expect(ANTHROPIC_API_KEY.startsWith('sk-ant-')).toBe(true);
            }
        });
    });

    describe('Gemini API Connection', () => {
        test('should connect to Gemini API and get a response', async () => {
            // Skip if no valid API key
            if (!GEMINI_API_KEY || GEMINI_API_KEY === 'fake-test-key') {
                console.log('Skipping Gemini test: No valid API key');
                return;
            }

            const { GoogleGenAI } = await import('@google/genai');

            const genAI = new GoogleGenAI({
                vertexai: false,
                apiKey: GEMINI_API_KEY,
            });

            try {
                const chat = await genAI.chats.create({
                    model: 'gemini-2.0-flash',
                    config: {
                        maxTokens: 50,
                        temperature: 0.1,
                    },
                });

                const response = await chat.sendMessage({
                    message: 'Reply with only the word "connected" to confirm API connection.',
                });

                expect(response).toBeDefined();
                expect(response.text).toBeDefined();
                expect(response.text.toLowerCase()).toContain('connected');

                console.log('✅ Gemini API connection successful');
            } catch (error) {
                console.error('❌ Gemini API connection failed:', error.message);
                throw error;
            }
        }, 30000); // 30 second timeout
    });

    describe('Anthropic (Claude) API Connection', () => {
        test('should connect to Anthropic API and get a response', async () => {
            // Skip if no valid API key
            if (!ANTHROPIC_API_KEY) {
                console.log('Skipping Anthropic test: No API key');
                return;
            }

            const Anthropic = (await import('@anthropic-ai/sdk')).default;

            const anthropic = new Anthropic({
                apiKey: ANTHROPIC_API_KEY,
            });

            try {
                const response = await anthropic.messages.create({
                    model: 'claude-sonnet-4-20250514',
                    max_tokens: 50,
                    messages: [
                        {
                            role: 'user',
                            content: 'Reply with only the word "connected" to confirm API connection.',
                        },
                    ],
                });

                expect(response).toBeDefined();
                expect(response.content).toBeDefined();
                expect(response.content.length).toBeGreaterThan(0);
                expect(response.content[0].text.toLowerCase()).toContain('connected');

                console.log('✅ Anthropic API connection successful');
            } catch (error) {
                console.error('❌ Anthropic API connection failed:', error.message);
                throw error;
            }
        }, 30000); // 30 second timeout
    });
});

describe('LLM API Feature Tests', () => {
    describe('Gemini Chat Functionality', () => {
        test('should handle multi-turn conversation', async () => {
            if (!GEMINI_API_KEY || GEMINI_API_KEY === 'fake-test-key') {
                console.log('Skipping: No valid Gemini API key');
                return;
            }

            const { GoogleGenAI } = await import('@google/genai');

            const genAI = new GoogleGenAI({
                vertexai: false,
                apiKey: GEMINI_API_KEY,
            });

            const chat = await genAI.chats.create({
                model: 'gemini-2.0-flash',
                config: {
                    maxTokens: 100,
                    temperature: 0.3,
                    systemInstruction: {
                        parts: [{ text: 'You are a helpful assistant. Keep responses brief.' }],
                        role: 'system',
                    },
                },
            });

            // First message
            const response1 = await chat.sendMessage({
                message: 'My name is TestUser.',
            });
            expect(response1.text).toBeDefined();

            // Second message - should remember context
            const response2 = await chat.sendMessage({
                message: 'What is my name?',
            });
            expect(response2.text.toLowerCase()).toContain('testuser');

            console.log('✅ Gemini multi-turn conversation working');
        }, 60000);

        test('should apply system prompts correctly', async () => {
            if (!GEMINI_API_KEY || GEMINI_API_KEY === 'fake-test-key') {
                console.log('Skipping: No valid Gemini API key');
                return;
            }

            const { GoogleGenAI } = await import('@google/genai');

            const genAI = new GoogleGenAI({
                vertexai: false,
                apiKey: GEMINI_API_KEY,
            });

            const chat = await genAI.chats.create({
                model: 'gemini-2.0-flash',
                config: {
                    maxTokens: 100,
                    temperature: 0.1,
                    systemInstruction: {
                        parts: [{ text: 'You are a CBT therapist. Always mention "cognitive behavioral therapy" in your responses.' }],
                        role: 'system',
                    },
                },
            });

            const response = await chat.sendMessage({
                message: 'How can you help me?',
            });

            expect(response.text.toLowerCase()).toMatch(/cognitive|cbt|behavioral/);
            console.log('✅ Gemini system prompt working');
        }, 30000);
    });

    describe('Anthropic Chat Functionality', () => {
        test('should handle system prompts correctly', async () => {
            if (!ANTHROPIC_API_KEY) {
                console.log('Skipping: No Anthropic API key');
                return;
            }

            const Anthropic = (await import('@anthropic-ai/sdk')).default;

            const anthropic = new Anthropic({
                apiKey: ANTHROPIC_API_KEY,
            });

            const response = await anthropic.messages.create({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 100,
                system: 'You are a MBT therapist. Always mention "mentalization" in your responses.',
                messages: [
                    {
                        role: 'user',
                        content: 'How can you help me?',
                    },
                ],
            });

            expect(response.content[0].text.toLowerCase()).toMatch(/mental|mentalization|feelings/);
            console.log('✅ Anthropic system prompt working');
        }, 30000);
    });
});
