import { describe, expect, test } from 'vitest';
import { parseInitialModeMarker, INITIAL_MAX_ROUNDS } from '../src/utils/llm.js';

// ============================================
// Unit tests: INITIAL mode helpers in llm.js
// No DB or LLM connections are made.
// ============================================

describe('INITIAL_MAX_ROUNDS', () => {
    test('equals 5', () => {
        expect(INITIAL_MAX_ROUNDS).toBe(5);
    });
});

describe('parseInitialModeMarker', () => {
    test('returns null selectedMode and original text when no marker is present', () => {
        const text = 'This is a normal AI response without any marker.';
        const { cleanText, selectedMode } = parseInitialModeMarker(text);
        expect(selectedMode).toBeNull();
        expect(cleanText).toBe(text);
    });

    test('strips CBT marker and returns selectedMode CBT', () => {
        const { cleanText, selectedMode } = parseInitialModeMarker(
            'Some response text\n<<SELECTED_MODE:CBT>>'
        );
        expect(selectedMode).toBe('CBT');
        expect(cleanText).toBe('Some response text');
        expect(cleanText).not.toContain('<<SELECTED_MODE:');
    });

    test('strips MBT marker and returns selectedMode MBT', () => {
        const { cleanText, selectedMode } = parseInitialModeMarker(
            'Some response text\n<<SELECTED_MODE:MBT>>'
        );
        expect(selectedMode).toBe('MBT');
        expect(cleanText).toBe('Some response text');
    });

    test('strips MBCT marker and returns selectedMode MBCT', () => {
        const { cleanText, selectedMode } = parseInitialModeMarker(
            'Some response text\n<<SELECTED_MODE:MBCT>>'
        );
        expect(selectedMode).toBe('MBCT');
        expect(cleanText).toBe('Some response text');
    });

    test('handles trailing whitespace after marker', () => {
        const { cleanText, selectedMode } = parseInitialModeMarker(
            'Text\n<<SELECTED_MODE:CBT>>   \n  '
        );
        expect(selectedMode).toBe('CBT');
        expect(cleanText).toBe('Text');
    });

    test('handles text that is only the marker with no preceding text', () => {
        const { cleanText, selectedMode } = parseInitialModeMarker('<<SELECTED_MODE:CBT>>');
        expect(selectedMode).toBe('CBT');
        expect(cleanText).toBe('');
    });

    test('does not match marker embedded in the middle of text (requires end-of-string anchor)', () => {
        const text = 'Text before\n<<SELECTED_MODE:CBT>>\nText after';
        const { cleanText, selectedMode } = parseInitialModeMarker(text);
        expect(selectedMode).toBeNull();
        expect(cleanText).toBe(text);
    });

    test('does not match unknown mode names', () => {
        const text = 'Some text\n<<SELECTED_MODE:INVALID>>';
        const { cleanText, selectedMode } = parseInitialModeMarker(text);
        expect(selectedMode).toBeNull();
        expect(cleanText).toBe(text);
    });

    test('handles empty string input without throwing', () => {
        const { cleanText, selectedMode } = parseInitialModeMarker('');
        expect(selectedMode).toBeNull();
        expect(cleanText).toBe('');
    });

    test('multi-line response text is preserved before the marker', () => {
        const body = '第一段\n\n第二段\n第三段';
        const { cleanText, selectedMode } = parseInitialModeMarker(
            `${body}\n<<SELECTED_MODE:MBT>>`
        );
        expect(selectedMode).toBe('MBT');
        expect(cleanText).toBe(body);
    });
});

// NOTE: getSystemPrompt tests moved to Python inference module (inference/src/prompts.py).
// The prompts are no longer exported from Node.js llm.js.
