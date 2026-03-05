#!/usr/bin/env node
/**
 * Mind Echo — Interactive Prompt Tester
 *
 * A CLI REPL for testing system prompts against real LLM APIs.
 * Maintains in-memory conversation history. No database required.
 *
 * Usage:
 *   node scripts/test-chat.js
 *   node scripts/test-chat.js --mode CBT --provider anthropic
 *
 * Commands (type during session):
 *   /mode <DEFAULT|CBT|MBT|MBCT>    switch mode (resets conversation)
 *   /provider <gemini|anthropic>    switch LLM provider
 *   /reset                          clear conversation history
 *   /history                        show full conversation so far
 *   /prompt                         print the current system prompt
 *   /help                           show this help
 *   exit                            quit
 */

import readline from 'readline';
import dotenv from 'dotenv';
dotenv.config();

import { getSystemPrompt } from '../src/utils/llm.js';

// ── Config ────────────────────────────────────────────────────────────────────

const VALID_MODES = ['DEFAULT', 'CBT', 'MBT', 'MBCT'];
const VALID_PROVIDERS = ['gemini', 'anthropic'];

const args = process.argv.slice(2);
const argMode = args.find((_, i) => args[i - 1] === '--mode')?.toUpperCase();
const argProvider = args.find((_, i) => args[i - 1] === '--provider')?.toLowerCase();

let currentMode = VALID_MODES.includes(argMode) ? argMode : 'DEFAULT';
let currentProvider = VALID_PROVIDERS.includes(argProvider) ? argProvider : 'gemini';
let conversationHistory = []; // { role: 'user' | 'assistant', content: string }

// ── LLM Calls ─────────────────────────────────────────────────────────────────

const callGemini = async (text) => {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not set in .env');
    }

    const { GoogleGenAI } = await import('@google/genai');
    const genAI = new GoogleGenAI({ vertexai: false, apiKey: process.env.GEMINI_API_KEY });

    const history = conversationHistory.map((m) => ({
        parts: [{ text: m.content }],
        role: m.role === 'user' ? 'user' : 'model',
    }));

    const chat = await genAI.chats.create({
        model: 'gemini-2.5-pro',
        config: {
            maxTokens: 1000,
            temperature: 0.7,
            topP: 0.9,
            systemInstruction: {
                parts: [{ text: getSystemPrompt(currentMode) }],
                role: 'system',
            },
        },
        history,
    });

    const response = await chat.sendMessage({ message: text });
    return response.text;
};

const callAnthropic = async (text) => {
    if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY is not set in .env');
    }

    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const messages = [
        ...conversationHistory.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: text },
    ];

    const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: getSystemPrompt(currentMode),
        messages,
    });

    return response.content[0].text;
};

const sendMessage = async (text) => {
    const reply =
        currentProvider === 'anthropic' ? await callAnthropic(text) : await callGemini(text);

    conversationHistory.push({ role: 'user', content: text });
    conversationHistory.push({ role: 'assistant', content: reply });

    return reply;
};

// ── Commands ──────────────────────────────────────────────────────────────────

const handleCommand = (input) => {
    const parts = input.trim().split(/\s+/);
    const cmd = parts[0];

    if (cmd === '/mode') {
        const val = parts[1]?.toUpperCase();
        if (!VALID_MODES.includes(val)) {
            console.log(`\n  Available modes: ${VALID_MODES.join(', ')}\n`);
            return;
        }
        currentMode = val;
        conversationHistory = [];
        console.log(`\n  Mode set to ${currentMode}. Conversation reset.\n`);
        return;
    }

    if (cmd === '/provider') {
        const val = parts[1]?.toLowerCase();
        if (!VALID_PROVIDERS.includes(val)) {
            console.log(`\n  Available providers: ${VALID_PROVIDERS.join(', ')}\n`);
            return;
        }
        currentProvider = val;
        console.log(`\n  Provider set to ${currentProvider}.\n`);
        return;
    }

    if (cmd === '/reset') {
        conversationHistory = [];
        console.log('\n  Conversation reset.\n');
        return;
    }

    if (cmd === '/history') {
        if (conversationHistory.length === 0) {
            console.log('\n  No history yet.\n');
            return;
        }
        console.log('\n' + '─'.repeat(60));
        conversationHistory.forEach((m) => {
            const label = m.role === 'user' ? 'You      ' : 'Assistant';
            console.log(`  ${label} | ${m.content}\n`);
        });
        console.log('─'.repeat(60) + '\n');
        return;
    }

    if (cmd === '/prompt') {
        console.log('\n' + '─'.repeat(60));
        console.log(getSystemPrompt(currentMode));
        console.log('─'.repeat(60) + '\n');
        return;
    }

    if (cmd === '/help') {
        console.log(`
  Commands:
    /mode <DEFAULT|CBT|MBT|MBCT>   switch mode (resets conversation)
    /provider <gemini|anthropic>   switch LLM provider
    /reset                         clear conversation history
    /history                       show conversation so far
    /prompt                        print the current system prompt
    /help                          show this help
    exit                           quit
`);
        return;
    }

    console.log(`\n  Unknown command: ${cmd}. Type /help for commands.\n`);
};

// ── REPL ──────────────────────────────────────────────────────────────────────

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const getPromptLabel = () => `[${currentMode} | ${currentProvider}] You > `;

const loop = () => {
    rl.question(getPromptLabel(), async (input) => {
        input = input.trim();

        if (!input) {
            loop();
            return;
        }

        if (input.toLowerCase() === 'exit') {
            console.log('\n  Goodbye.\n');
            rl.close();
            return;
        }

        if (input.startsWith('/')) {
            handleCommand(input);
            loop();
            return;
        }

        process.stdout.write('\nAssistant > ');

        try {
            const reply = await sendMessage(input);
            console.log(reply + '\n');
        } catch (err) {
            console.log(`\n[Error] ${err.message}\n`);
        }

        loop();
    });
};

// ── Start ─────────────────────────────────────────────────────────────────────

console.log('\n' + '='.repeat(60));
console.log('  Mind Echo — Interactive Prompt Tester');
console.log('='.repeat(60));
console.log(`  Mode     : ${currentMode}`);
console.log(`  Provider : ${currentProvider}`);
console.log('  Type /help for commands, exit to quit.');
console.log('='.repeat(60) + '\n');

loop();
