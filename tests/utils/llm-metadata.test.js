/**
 * tests/utils/llm-metadata.test.js
 *
 * Phase 4 — verify buildResponseMetadata extracts tokens/model/latency
 * from both Gemini-shaped and Anthropic-shaped provider payloads, and
 * never throws on malformed input.
 */
import { describe, test, expect, vi } from 'vitest';

// Avoid pulling Prisma client at import time -- mock the module path used inside llm.js.
vi.mock('../../src/config/database.js', () => ({
    default: {
        chatSession: { findUnique: vi.fn(), update: vi.fn() },
        message: { count: vi.fn(), create: vi.fn(), findMany: vi.fn() },
    },
}));

const { buildResponseMetadata } = await import('../../src/utils/llm.js');

describe('buildResponseMetadata', () => {
    test('extracts Anthropic-shaped usage', () => {
        const meta = buildResponseMetadata(
            {
                text: 'hi',
                latencyMs: 123,
                model: 'claude-haiku-4-5',
                usage: { input_tokens: 12, output_tokens: 34 },
            },
            'ANTHROPIC',
        );
        expect(meta.tokens).toEqual({ input: 12, output: 34, total: 46 });
        expect(meta.provider).toBe('ANTHROPIC');
        expect(meta.model).toBe('claude-haiku-4-5');
        expect(meta.latencyMs).toBe(123);
    });

    test('extracts Gemini-shaped usage (input_tokens/output_tokens after inference normalizes them)', () => {
        const meta = buildResponseMetadata(
            { text: 'ok', model: 'gemini-2.0-flash', usage: { input_tokens: 5, output_tokens: 7 }, latencyMs: 50 },
            'GEMINI',
        );
        expect(meta.tokens).toEqual({ input: 5, output: 7, total: 12 });
        expect(meta.model).toBe('gemini-2.0-flash');
    });

    test('also accepts OpenAI-style prompt_tokens / completion_tokens', () => {
        const meta = buildResponseMetadata(
            { text: 'ok', usage: { prompt_tokens: 3, completion_tokens: 4 } },
            'OPENAI',
        );
        expect(meta.tokens).toEqual({ input: 3, output: 4, total: 7 });
    });

    test('null tokens when usage is missing', () => {
        const meta = buildResponseMetadata({ text: 'ok' }, 'GEMINI');
        expect(meta.tokens).toBeNull();
        expect(meta.provider).toBe('GEMINI');
    });

    test('does not throw on malformed input', () => {
        expect(() => buildResponseMetadata(null, 'X')).not.toThrow();
        expect(() => buildResponseMetadata(undefined, 'X')).not.toThrow();
        expect(() => buildResponseMetadata({ usage: 'nope' }, 'X')).not.toThrow();
        expect(() => buildResponseMetadata({ usage: { input_tokens: 'NaN' } }, 'X')).not.toThrow();
    });
});
