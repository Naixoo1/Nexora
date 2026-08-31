import { describe, it, expect } from 'vitest';
import { sanitizeReasoningContent, createReasoningFilterTransform } from '@/services/reasoning-sanitizer';
import { normalizePhoneticQuery } from '@/services/stt-phonetic-aligner';

describe('Automated AI Agent Voice & Anti-CoT Stress-Test Suite', () => {
  // Helper to read a ReadableStream filtered by createReasoningFilterTransform
  async function filterStreamText(rawText: string, chunkSize = 12): Promise<string> {
    const transform = createReasoningFilterTransform();
    const readable = new ReadableStream<string>({
      start(controller) {
        for (let i = 0; i < rawText.length; i += chunkSize) {
          controller.enqueue(rawText.slice(i, i + chunkSize));
        }
        controller.close();
      },
    });

    const reader = readable.pipeThrough(transform).getReader();
    let accumulated = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) accumulated += value;
    }
    return accumulated;
  }

  describe('STT Acoustic & Phonetic Drift Reconstruction (20+ Scenarios)', () => {
    const phoneticTestCases = [
      {
        name: 'Case 1: Spoken root & written numbers',
        input: 'what is route of one twenty one',
        expectedTerm: 'root of 121',
      },
      {
        name: 'Case 2: Indonesian spelling drift in geometry',
        input: 'explain deret geometri dan chontohnya',
        expectedTerm: 'deret geometri dan contohnya',
      },
      {
        name: 'Case 3: English calculus deviation/derivation confusion',
        input: 'find the deviation of x squared',
        expectedTerm: 'find the derivation of x squared',
      },
      {
        name: 'Case 4: Linear algebra matrix homophone',
        input: 'calculate determinant of metrics',
        expectedTerm: 'determinant of matrix',
      },
      {
        name: 'Case 5: Trigonometric sign/sine homophone',
        input: 'what is sign of x as x approaches zero',
        expectedTerm: 'sin of x',
      },
      {
        name: 'Case 6: Vector homophone victor',
        input: 'victor addition in two dimensions',
        expectedTerm: 'vector addition',
      },
      {
        name: 'Case 7: Square route of 144',
        input: 'square route of one forty four',
        expectedTerm: 'square root of 144',
      },
      {
        name: 'Case 8: Area of circle pie r squared',
        input: 'formula for pie r squared',
        expectedTerm: 'pi r^2',
      },
      {
        name: 'Case 9: Indonesian turonan clipping',
        input: 'rumus turonan fungsi trigonometri',
        expectedTerm: 'turunan fungsi trigonometri',
      },
      {
        name: 'Case 10: Indonesian persaman typo',
        input: 'persaman kuadrat dua variabel',
        expectedTerm: 'persamaan kuadrat dua variabel',
      },
      {
        name: 'Case 11: Indonesian akarr distortion',
        input: 'akarr pangkat tiga dari 27',
        expectedTerm: 'akar pangkat tiga dari 27',
      },
      {
        name: 'Case 12: Indonesian fektor variation',
        input: 'konsep fektor dan skalar',
        expectedTerm: 'vektor dan skalar',
      },
      {
        name: 'Case 13: Indonesian kalkuluse ending',
        input: 'kalkuluse diferensial dan integral',
        expectedTerm: 'kalkulus diferensial dan integral',
      },
    ];

    phoneticTestCases.forEach(({ name, input, expectedTerm }) => {
      it(`reconstructs phonetic meaning in [${name}]`, () => {
        const normalized = normalizePhoneticQuery(input);
        expect(normalized).toContain(expectedTerm);
      });
    });
  });

  describe('Anti-Thought Leak & Reasoning Filter Stress Tests', () => {
    const leakTestCases = [
      {
        name: 'CoT Leak 1: Enclosed <think> tags',
        raw: '<think>Let me calculate the square root of 121. 11 * 11 = 121.</think>The principal square root of 121 is 11.',
        expectedClean: 'The principal square root of 121 is 11.',
      },
      {
        name: 'CoT Leak 2: Thinking Process preamble header',
        raw: "Thinking Process:\n1. Analyze the student's question.\n2. Selesaikan turunan.\n\nBerikut adalah langkah penyelesaiannya.",
        expectedClean: 'Berikut adalah langkah penyelesaiannya.',
      },
      {
        name: 'CoT Leak 3: Here\'s a thinking process preamble',
        raw: "Here's a thinking process:\nLet's analyze the request and ensure we answer in English.\n\nThe square root of 144 is 12.",
        expectedClean: 'The square root of 144 is 12.',
      },
      {
        name: 'CoT Leak 4: Drafting the Content & Mental Refinement',
        raw: 'Drafting the Content (Mental Refinement):\nLet\'s create a Socratic inquiry.\n\nApakah kamu sudah mengetahui rumus diskriminan?',
        expectedClean: 'Apakah kamu sudah mengetahui rumus diskriminan?',
      },
      {
        name: 'CoT Leak 5: Let\'s analyze preamble',
        raw: "Let's analyze the user's inquiry:\nI will present the step-by-step proof.\n\nBerdasarkan Teorema Pythagoras, $a^2 + b^2 = c^2$.",
        expectedClean: 'Berdasarkan Teorema Pythagoras, $a^2 + b^2 = c^2$.',
      },
      {
        name: 'CoT Leak 6: User safety evaluation tag',
        raw: 'User safety:safe\n\nHalo! Ada yang bisa saya bantu hari ini?',
        expectedClean: 'Halo! Ada yang bisa saya bantu hari ini?',
      },
      {
        name: 'CoT Leak 7: Bracketed safety rating tag',
        raw: '[user safety: safe]\n\nSampurasun! Kumaha damang?',
        expectedClean: 'Sampurasun! Kumaha damang?',
      },
      {
        name: 'CoT Leak 8: Numbered CoT instructions',
        raw: "1. Identify Persona: Socratic STEM Tutor\n2. Formulate Question\n\nTentukan turunan pertama dari fungsi $f(x) = x^3$.",
        expectedClean: 'Tentukan turunan pertama dari fungsi $f(x) = x^3$.',
      },
      {
        name: 'CoT Leak 9: Let\'s draft a response for the student',
        raw: "Let's draft a response for the student:\n\nPersamaan garis singgungnya adalah $y = 2x - 1$.",
        expectedClean: 'Persamaan garis singgungnya adalah $y = 2x - 1$.',
      },
      {
        name: 'CoT Leak 10: Okay, the user is asking scratchpad',
        raw: 'Okay, the user is asking about the square root of 169. Looking at the history, they are practicing roots.\n\nThe square root of 169 is 13.',
        expectedClean: 'The square root of 169 is 13.',
      },
      {
        name: 'CoT Leak 11: Unclosed <think> stream truncation',
        raw: '<think>Let me verify the answer... The derivative of x^2 is 2x.',
        expectedClean: '',
      },
    ];

    leakTestCases.forEach(({ name, raw, expectedClean }) => {
      it(`sanitizes static text in [${name}]`, () => {
        const cleaned = sanitizeReasoningContent(raw);
        expect(cleaned).not.toContain('<think>');
        expect(cleaned).not.toContain('</think>');
        expect(cleaned).not.toContain('Thinking Process');
        expect(cleaned).not.toContain('Drafting the Content');
        expect(cleaned).not.toContain('Mental Refinement');
        expect(cleaned).not.toContain('User safety:');
        expect(cleaned).not.toContain('user safety:');
        if (expectedClean) {
          expect(cleaned).toBe(expectedClean);
        }
      });

      it(`sanitizes streaming chunks on the fly in [${name}]`, async () => {
        const streamResult = await filterStreamText(raw);
        expect(streamResult).not.toContain('<think>');
        expect(streamResult).not.toContain('</think>');
        expect(streamResult).not.toContain('Thinking Process');
        expect(streamResult).not.toContain('Drafting the Content');
        expect(streamResult).not.toContain('Mental Refinement');
        expect(streamResult).not.toContain('User safety:');
      });
    });
  });
});
