#!/usr/bin/env node
/**
 * LLM API Connection Test Script
 *
 * Quick health check for Gemini and Anthropic API connections.
 *
 * Usage:
 *   node scripts/test-llm-connection.js
 *   node scripts/test-llm-connection.js --gemini
 *   node scripts/test-llm-connection.js --anthropic
 */

import dotenv from 'dotenv';
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const args = process.argv.slice(2);
const testGemini = args.length === 0 || args.includes('--gemini');
const testAnthropic = args.length === 0 || args.includes('--anthropic');

console.log('\n🔍 LLM API Connection Test\n');
console.log('='.repeat(50));

async function testGeminiConnection() {
    console.log('\n📡 Testing Gemini API...');

    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'fake-test-key') {
        console.log('   ⚠️  GEMINI_API_KEY not set or invalid');
        return false;
    }

    try {
        const { GoogleGenAI } = await import('@google/genai');

        const genAI = new GoogleGenAI({
            vertexai: false,
            apiKey: GEMINI_API_KEY,
        });

        console.log('   → Creating chat session...');

        const chat = await genAI.chats.create({
            model: 'gemini-2.0-flash',
            config: {
                maxTokens: 50,
                temperature: 0.1,
            },
        });

        console.log('   → Sending test message...');

        const startTime = Date.now();
        const response = await chat.sendMessage({
            message: 'Say "Hello" in one word.',
        });
        const latency = Date.now() - startTime;

        console.log(`   ✅ Gemini API Connected!`);
        console.log(`   📊 Response: "${response.text.trim()}"`);
        console.log(`   ⏱️  Latency: ${latency}ms`);

        return true;
    } catch (error) {
        const errorMsg = error.message || String(error);

        // Check for quota exceeded error
        if (errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.includes('quota')) {
            console.log(`   ⚠️  Gemini API Key Valid - But quota exceeded!`);
            console.log(`   💡 Tip: Wait for quota reset or upgrade to paid plan`);
            return 'quota_exceeded';
        }

        // Check for invalid API key
        if (errorMsg.includes('401') || errorMsg.includes('UNAUTHENTICATED') || errorMsg.includes('API key')) {
            console.log(`   ❌ Gemini API Key Invalid`);
            return false;
        }

        console.log(`   ❌ Gemini API Error: ${errorMsg.substring(0, 200)}...`);
        return false;
    }
}

async function testAnthropicConnection() {
    console.log('\n📡 Testing Anthropic (Claude) API...');

    if (!ANTHROPIC_API_KEY) {
        console.log('   ⚠️  ANTHROPIC_API_KEY not set');
        console.log('   💡 Add ANTHROPIC_API_KEY to .env file to enable Claude');
        return 'not_configured';
    }

    try {
        const Anthropic = (await import('@anthropic-ai/sdk')).default;

        const anthropic = new Anthropic({
            apiKey: ANTHROPIC_API_KEY,
        });

        console.log('   → Sending test message...');

        const startTime = Date.now();
        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 50,
            messages: [
                {
                    role: 'user',
                    content: 'Say "Hello" in one word.',
                },
            ],
        });
        const latency = Date.now() - startTime;

        console.log(`   ✅ Anthropic API Connected!`);
        console.log(`   📊 Response: "${response.content[0].text.trim()}"`);
        console.log(`   ⏱️  Latency: ${latency}ms`);
        console.log(`   📈 Usage: ${response.usage.input_tokens} input, ${response.usage.output_tokens} output tokens`);

        return true;
    } catch (error) {
        console.log(`   ❌ Anthropic API Error: ${error.message}`);
        return false;
    }
}

async function main() {
    const results = {
        gemini: null,
        anthropic: null,
    };

    if (testGemini) {
        results.gemini = await testGeminiConnection();
    }

    if (testAnthropic) {
        results.anthropic = await testAnthropicConnection();
    }

    console.log('\n' + '='.repeat(50));
    console.log('\n📋 Summary:');

    const getStatusText = (result) => {
        if (result === true) return '✅ OK';
        if (result === 'quota_exceeded') return '⚠️  Quota Exceeded (Key Valid)';
        if (result === 'not_configured') return '⏭️  Not Configured';
        if (result === null) return '⏭️  Skipped';
        return '❌ Failed';
    };

    if (testGemini) {
        console.log(`   Gemini:    ${getStatusText(results.gemini)}`);
    }
    if (testAnthropic) {
        console.log(`   Anthropic: ${getStatusText(results.anthropic)}`);
    }

    // quota_exceeded and not_configured don't count as failures
    const allPassed = Object.values(results).every((r) =>
        r === true || r === 'quota_exceeded' || r === 'not_configured' || r === null
    );
    console.log(`\n${allPassed ? '🎉 All API connections verified!' : '⚠️  Some tests failed'}\n`);

    process.exit(allPassed ? 0 : 1);
}

main();
