#!/usr/bin/env node
/**
 * Summarize raw therapy PDFs into skill-structured .md files.
 *
 * Usage:
 *   node scripts/summarize-raw.js                      # process all modes
 *   node scripts/summarize-raw.js --mode cbt            # process only CBT
 *   node scripts/summarize-raw.js --provider anthropic   # use Anthropic instead of Gemini
 *   node scripts/summarize-raw.js --dry-run              # extract text only, skip LLM
 *
 * Reads PDFs from docs/raw/{mode}/, generates .md summaries in docs/sums/{mode}/.
 * Each summary is a self-contained "skill" file with YAML frontmatter.
 */

import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const DOCS_RAW = path.resolve('docs/raw');
const DOCS_SUMS = path.resolve('docs/sums');
const MODES = ['cbt', 'mbt', 'mbct'];

const CHUNK_MAX_CHARS = 80_000; // ~20k tokens — safe for most models

const args = process.argv.slice(2);
const modeFilter = args.includes('--mode')
    ? args[args.indexOf('--mode') + 1]?.toLowerCase()
    : null;
const provider = args.includes('--provider')
    ? args[args.indexOf('--provider') + 1]?.toUpperCase()
    : 'GEMINI';
const dryRun = args.includes('--dry-run');

// ── LLM clients ──────────────────────────────────────────────

async function callGemini(systemPrompt, userPrompt) {
    const { GoogleGenAI } = await import('@google/genai');
    const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const response = await genai.models.generateContent({
        model: process.env.GEMINI_MODEL_NAME || 'gemini-2.5-flash',
        contents: userPrompt,
        config: {
            systemInstruction: systemPrompt,
            temperature: 0.3,
            maxOutputTokens: 4096,
        },
    });

    return response.text;
}

async function callAnthropic(systemPrompt, userPrompt) {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
        model: process.env.ANTHROPIC_MODEL_NAME || 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
    });

    return response.content[0].text;
}

async function callLLM(systemPrompt, userPrompt) {
    if (provider === 'ANTHROPIC') {
        return callAnthropic(systemPrompt, userPrompt);
    }
    return callGemini(systemPrompt, userPrompt);
}

// ── PDF extraction ───────────────────────────────────────────

async function extractPdfText(pdfPath) {
    const buffer = fs.readFileSync(pdfPath);
    const data = await pdfParse(buffer);
    return data.text;
}

// ── Summarization prompt ─────────────────────────────────────

function getSummarizationSystemPrompt(mode) {
    return `You are an expert clinical psychology summarizer. Your job is to read raw therapy textbook content and produce structured, concise knowledge summaries that a therapy chatbot can use as reference context.

You will receive a chunk of text from a ${mode.toUpperCase()} therapy textbook. Produce ONE OR MORE skill-structured markdown files from it. Each file covers a distinct therapeutic concept, technique, or principle found in the text.

For each skill file, output EXACTLY this format (including the --- delimiters):

---
name: kebab-case-identifier
description: One-line summary of what this knowledge covers
mode: ${mode}
topics: [topic1, topic2, topic3]
when_to_use: >
  Natural language description of when a therapist would draw on this knowledge
  during a session. Be specific about the conversational cues or client presentations
  that would make this knowledge relevant.
token_estimate: approximate_number
---

## Title

(Summarized content here — 200-600 words per file. Focus on practical therapeutic
knowledge: what the concept is, how to recognize it in a client, and how to work
with it in session. Write for a therapist companion, not a textbook reader.)

RULES:
- Produce multiple files if the text covers multiple distinct topics. Separate each file with a line containing only: ===FILE_BREAK===
- Keep each file focused on ONE concept/technique
- topics array: 3-8 keywords that a model could match against conversation themes
- when_to_use: describe the client presentation or conversational moment, not abstract theory
- token_estimate: count approximate tokens in the body (not frontmatter). 1 word ≈ 1.3 tokens
- Write in English. The chatbot will use this as internal reference — the chatbot itself responds in Traditional Chinese
- Do NOT invent content beyond what the source text supports
- If the text chunk contains no therapeutically useful content (e.g. table of contents, references, copyright), output exactly: ===SKIP===`;
}

// ── Main pipeline ────────────────────────────────────────────

function chunkText(text, maxChars) {
    const chunks = [];
    for (let i = 0; i < text.length; i += maxChars) {
        chunks.push(text.slice(i, i + maxChars));
    }
    return chunks;
}

function sanitizeFilename(name) {
    return name.replace(/[^a-z0-9-]/g, '').slice(0, 60);
}

async function processOnePdf(pdfPath, mode) {
    const pdfName = path.basename(pdfPath);
    console.log(`\n  📄 ${pdfName}`);

    const rawText = await extractPdfText(pdfPath);
    console.log(`     Extracted ${rawText.length} chars`);

    if (dryRun) {
        const previewPath = path.join(DOCS_SUMS, mode, `_preview_${path.parse(pdfName).name}.txt`);
        fs.writeFileSync(previewPath, rawText.slice(0, 5000));
        console.log(`     [dry-run] Wrote text preview to ${previewPath}`);
        return;
    }

    const chunks = chunkText(rawText, CHUNK_MAX_CHARS);
    console.log(`     Split into ${chunks.length} chunk(s)`);

    const systemPrompt = getSummarizationSystemPrompt(mode);
    let fileCount = 0;

    for (let i = 0; i < chunks.length; i++) {
        console.log(`     Processing chunk ${i + 1}/${chunks.length}...`);

        const userPrompt = `Source: ${pdfName} (chunk ${i + 1}/${chunks.length})\n\n${chunks[i]}`;

        let result;
        try {
            result = await callLLM(systemPrompt, userPrompt);
        } catch (err) {
            console.error(`     ❌ LLM error on chunk ${i + 1}: ${err.message}`);
            continue;
        }

        if (!result || !result.trim()) {
            console.log(`     ⚠️  Empty response from LLM on chunk ${i + 1}, skipping`);
            continue;
        }

        if (result.trim() === '===SKIP===') {
            console.log(`     Skipped (no therapeutic content)`);
            continue;
        }

        const files = result.split('===FILE_BREAK===').map((f) => f.trim()).filter(Boolean);

        for (const fileContent of files) {
            const nameMatch = fileContent.match(/^---\s*\nname:\s*(.+)/m);
            const name = nameMatch
                ? sanitizeFilename(nameMatch[1].trim())
                : `${mode}-topic-${fileCount}`;

            const outPath = path.join(DOCS_SUMS, mode, `${name}.md`);

            if (fs.existsSync(outPath)) {
                console.log(`     ⚠️  ${name}.md already exists, skipping`);
                continue;
            }

            fs.writeFileSync(outPath, fileContent + '\n');
            fileCount++;
            console.log(`     ✅ ${name}.md`);
        }
    }

    console.log(`     Generated ${fileCount} file(s)`);
}

async function main() {
    console.log('🧠 Therapy Knowledge Summarizer');
    console.log(`   Provider: ${provider}`);
    console.log(`   Mode filter: ${modeFilter || 'all'}`);
    if (dryRun) console.log('   ⚡ DRY RUN — no LLM calls');
    console.log();

    const modesToProcess = modeFilter ? [modeFilter] : MODES;

    for (const mode of modesToProcess) {
        const rawDir = path.join(DOCS_RAW, mode);

        if (!fs.existsSync(rawDir)) {
            console.log(`📁 ${mode}/ — no raw directory, skipping`);
            continue;
        }

        const pdfs = fs.readdirSync(rawDir).filter((f) => f.toLowerCase().endsWith('.pdf'));

        if (pdfs.length === 0) {
            console.log(`📁 ${mode}/ — no PDFs found`);
            continue;
        }

        console.log(`📁 ${mode}/ — ${pdfs.length} PDF(s)`);

        for (const pdf of pdfs) {
            await processOnePdf(path.join(rawDir, pdf), mode);
        }
    }

    console.log('\n✅ Done');
}

main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
