import { describe, it, expect } from 'vitest';
import {
  sanitizeReasoningContent,
  createReasoningFilterTransform,
} from '@/services/reasoning-sanitizer';

describe('Reasoning Sanitizer & Stream Filter', () => {
  describe('sanitizeReasoningContent', () => {
    it('strips complete <think>...</think> blocks from completed string', () => {
      const input = '<think>I need to solve this arithmetic progression question step-by-step.</think>Halo! Mari kita selesaikan soal barisan aritmetika ini.';
      const output = sanitizeReasoningContent(input);

      expect(output).toBe('Halo! Mari kita selesaikan soal barisan aritmetika ini.');
      expect(output).not.toContain('<think>');
      expect(output).not.toContain('</think>');
      expect(output).not.toContain('I need to solve');
    });

    it('strips unclosed <think> blocks if stream was truncated', () => {
      const input = 'Hasil awal.\n<think>Analyzing edge cases...';
      const output = sanitizeReasoningContent(input);

      expect(output).toBe('Hasil awal.');
      expect(output).not.toContain('Analyzing edge cases');
    });

    it('strips standalone closing </think> tags', () => {
      const input = '</think>Berikut adalah langkah penyelesaiannya:';
      const output = sanitizeReasoningContent(input);

      expect(output).toBe('Berikut adalah langkah penyelesaiannya:');
    });

    it('preserves mathematical equations and formulas intact', () => {
      const input = '<think>Deriving derivative of x^2</think>Turunan dari $f(x) = x^2$ adalah:\n$$\nf\'(x) = 2x\n$$';
      const output = sanitizeReasoningContent(input);

      expect(output).toContain('$f(x) = x^2$');
      expect(output).toContain('f\'(x) = 2x');
      expect(output).not.toContain('Deriving derivative');
    });
  });

  describe('createReasoningFilterTransform streaming', () => {
    it('filters thinking blocks split across multiple streaming chunks', async () => {
      const chunks = [
        'Halo! ',
        '<th',
        'ink>Analyzing problem context and rules',
        '</think>Berikut ',
        'adalah solusinya.',
      ];

      const readable = new ReadableStream<string>({
        start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(chunk);
          }
          controller.close();
        },
      });

      const filteredStream = readable.pipeThrough(createReasoningFilterTransform());
      const reader = filteredStream.getReader();

      let result = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) result += value;
      }

      expect(result).toBe('Halo! Berikut adalah solusinya.');
      expect(result).not.toContain('<think>');
      expect(result).not.toContain('Analyzing problem');
    });
  });
});
