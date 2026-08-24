import { describe, it, expect } from 'vitest';
import {
  sanitizeReasoningContent,
  stripPlainTextMonologue,
  createReasoningFilterTransform,
} from '@/services/reasoning-sanitizer';

describe('Reasoning Sanitizer & Stream Filter', () => {
  describe('stripPlainTextMonologue', () => {
    it('strips "Here\'s a thinking process:" preambles and numbered CoT steps', () => {
      const input = `Here's a thinking process:
1. **Analyze User Input:** The user wants to find the sum of arithmetic progression with a_1 = 7 and d = 3.
2. **Determine Strategy:** Use formula S_n = n/2 (2a_1 + (n-1)d).
3. **Draft Response:** Provide clear step-by-step breakdown.

Halo! Mari kita hitung jumlah deret aritmetika tersebut dengan rumus umum:
$$
S_n = \\frac{n}{2}[2a_1 + (n-1)d]
$$`;

      const output = stripPlainTextMonologue(input);
      expect(output).toBe(`Halo! Mari kita hitung jumlah deret aritmetika tersebut dengan rumus umum:
$$
S_n = \\frac{n}{2}[2a_1 + (n-1)d]
$$`);
      expect(output).not.toContain("Here's a thinking process");
      expect(output).not.toContain('Analyze User Input');
    });

    it('strips "Let\'s check the rules" and "Thinking Process" headers', () => {
      const input = `Let's check the rules: The user asked in Sundanese, so we must respond in Basa Sunda without leaking thoughts.
Let's draft a response:

Sampurasun! Hayu urang pedar perkawis rumus barisan ieu.`;

      const output = stripPlainTextMonologue(input);
      expect(output).toBe('Sampurasun! Hayu urang pedar perkawis rumus barisan ieu.');
      expect(output).not.toContain("Let's check the rules");
    });

    it('preserves regular responses that start immediately with greetings or math without preamble', () => {
      const input = 'Halo! Rumus yang digunakan adalah $E = mc^2$.';
      const output = stripPlainTextMonologue(input);
      expect(output).toBe(input);
    });
  });

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

    it('strips plain-text monologue combined with <think> remnants', () => {
      const input = `Here's a thinking process:
1. Understand the problem.

Hello! Here is the mathematical explanation:
$$
f'(x) = 2x
$$`;
      const output = sanitizeReasoningContent(input);
      expect(output).toBe(`Hello! Here is the mathematical explanation:
$$
f'(x) = 2x
$$`);
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

    it('filters leading plain-text monologue chunks before streaming the real response', async () => {
      const chunks = [
        "Here's a thinking process:\n",
        '1. Analyze user prompt.\n',
        '2. Formulate step.\n\n',
        'Halo! ',
        'Mari kita mulai dengan langkah pertama.',
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

      expect(result).toBe('Halo! Mari kita mulai dengan langkah pertama.');
      expect(result).not.toContain("Here's a thinking process");
    });
  });
});
