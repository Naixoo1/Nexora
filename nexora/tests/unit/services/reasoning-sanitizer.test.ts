import { describe, it, expect } from 'vitest';
import {
  sanitizeReasoningContent,
  stripPlainTextMonologue,
  stripSafetyMetadata,
  cleanScriptBleed,
  createReasoningFilterTransform,
} from '@/services/reasoning-sanitizer';

describe('Reasoning Sanitizer & Stream Filter', () => {
  describe('stripSafetyMetadata', () => {
    it('strips "user safety:safe" and standalone safety headers', () => {
      const input = `user safety:safe
Deret aritmetika adalah barisan bilangan di mana selisih antara dua suku berurutan selalu tetap.`;

      const output = stripSafetyMetadata(input);
      expect(output).toBe(
        'Deret aritmetika adalah barisan bilangan di mana selisih antara dua suku berurutan selalu tetap.'
      );
      expect(output).not.toContain('user safety:safe');
    });

    it('strips bracketed safety tags like [safety: safe] and [user safety: safe]', () => {
      const input = '[safety: safe] [user safety: safe] Halo! Rumus suku ke-n adalah $U_n = a + (n-1)b$.';
      const output = stripSafetyMetadata(input);
      expect(output).toBe('Halo! Rumus suku ke-n adalah $U_n = a + (n-1)b$.');
      expect(output).not.toContain('[safety: safe]');
      expect(output).not.toContain('[user safety: safe]');
    });

    it('strips Input/Content Safety and Safety Assessment headers', () => {
      const input = `Input Safety: Safe
Content Safety: safe
Safety Assessment: Safe
Berikut adalah penjelasannya.`;
      const output = stripSafetyMetadata(input);
      expect(output).toBe('Berikut adalah penjelasannya.');
      expect(output).not.toContain('Safety');
    });
  });

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

    it('strips "Drafting the Content (Mental Refinement):" preamble from text', () => {
      const input = `Drafting the Content (Mental Refinement): Define deret geometri and provide formulas.

Deret geometri adalah penjumlahan suku-suku dari barisan geometri. Rumus suku ke-n adalah $U_n = a r^{n-1}$.`;

      const output = stripPlainTextMonologue(input);
      expect(output).toBe(
        'Deret geometri adalah penjumlahan suku-suku dari barisan geometri. Rumus suku ke-n adalah $U_n = a r^{n-1}$.'
      );
      expect(output).not.toContain('Drafting the Content');
      expect(output).not.toContain('Mental Refinement');
    });

    it('strips inline "Mental Refinement:" tags', () => {
      const input = `Mental Refinement:
Turunan fungsi $f(x) = x^2$ adalah $f'(x) = 2x$.`;

      const output = stripPlainTextMonologue(input);
      expect(output).toBe('Turunan fungsi $f(x) = x^2$ adalah $f\'(x) = 2x$.');
      expect(output).not.toContain('Mental Refinement');
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

    it('strips plain-text monologue combined with leaked safety tokens', () => {
      const input = `user safety:safe
Here's a thinking process:
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
      expect(output).not.toContain('user safety:safe');
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
    it('filters safety prefix tags from streaming output chunks', async () => {
      const chunks = [
        'user safety:safe\n',
        'Halo! ',
        'Deret aritmetika adalah barisan bilangan dengan selisih konstan.',
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

      expect(result).toBe('Halo! Deret aritmetika adalah barisan bilangan dengan selisih konstan.');
      expect(result).not.toContain('user safety:safe');
    });

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

    it('filters multilingual script bleeds like "deret几何rinya" in streaming chunks', async () => {
      const chunks = [
        'Mari kita periksa ',
        'deret几何rinya ',
        'dan rasio tetapnya.',
      ];

      const readable = new ReadableStream<string>({
        start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(chunk);
          }
          controller.close();
        },
      });

      const filteredStream = readable.pipeThrough(createReasoningFilterTransform('id'));
      const reader = filteredStream.getReader();

      let result = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) result += value;
      }

      expect(result).toBe('Mari kita periksa deret geometrinya dan rasio tetapnya.');
      expect(result).not.toContain('几何');
    });

    it('filters "Drafting the Content (Mental Refinement):" preamble in streaming chunks', async () => {
      const chunks = [
        'Drafting the Content (Mental Refinement): Define concept\n\n',
        'Deret geometri adalah ',
        'penjumlahan suku-suku barisan geometri.',
      ];

      const readable = new ReadableStream<string>({
        start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(chunk);
          }
          controller.close();
        },
      });

      const filteredStream = readable.pipeThrough(createReasoningFilterTransform('id'));
      const reader = filteredStream.getReader();

      let result = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) result += value;
      }

      expect(result).toBe('Deret geometri adalah penjumlahan suku-suku barisan geometri.');
      expect(result).not.toContain('Drafting the Content');
      expect(result).not.toContain('Mental Refinement');
    });
  });

  describe('cleanScriptBleed (Multilingual Token Hallucination Sanitizer)', () => {
    it('sanitizes "deret几何rinya" into "deret geometrinya" in Indonesian locale', () => {
      const input = 'Mari kita hitung deret几何rinya dengan suku pertama $a=2$.';
      const output = cleanScriptBleed(input, 'id');

      expect(output).toBe('Mari kita hitung deret geometrinya dengan suku pertama $a=2$.');
      expect(output).not.toContain('几何');
    });

    it('sanitizes standalone math Hanzi terms into Indonesian', () => {
      const input = 'Konsep 几何 dan 算术 sangat mendasar dalam matematika.';
      const output = cleanScriptBleed(input, 'id');

      expect(output).toBe('Konsep geometri dan aritmetika sangat mendasar dalam matematika.');
      expect(output).not.toContain('几何');
      expect(output).not.toContain('算术');
    });

    it('sanitizes math Hanzi terms into English when locale is "en"', () => {
      const input = 'The concept of 几何 and 算术 is fundamental.';
      const output = cleanScriptBleed(input, 'en');

      expect(output).toBe('The concept of geometry and arithmetic is fundamental.');
      expect(output).not.toContain('几何');
      expect(output).not.toContain('算术');
    });

    it('removes rogue standalone CJK characters for Latin locales without affecting math symbols', () => {
      const input = 'Tentukan nilai $x$ dari 这 persamaan $x^2 - 4 = 0$ 吧.';
      const output = cleanScriptBleed(input, 'id');

      expect(output).toBe('Tentukan nilai $x$ dari  persamaan $x^2 - 4 = 0$ .');
      expect(output).not.toContain('这');
      expect(output).not.toContain('吧');
      expect(output).toContain('$x^2 - 4 = 0$');
    });
  });
});

