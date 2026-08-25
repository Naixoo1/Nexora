import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { cleanTextForSpeech, useTextToSpeech } from '@/hooks/useTextToSpeech';

describe('Web Speech Synthesis Math Preprocessor (cleanTextForSpeech)', () => {
  describe('LaTeX Mathematical Formulas Conversion', () => {
    it('converts fractions \\frac{a}{b} into natural spoken words in ID and EN', () => {
      const latex = 'Rumus kecepatan rata-rata adalah $v = \\frac{s}{t}$.';
      const spokenId = cleanTextForSpeech(latex, 'id');
      expect(spokenId).toContain('s per t');
      expect(spokenId).toContain('sama dengan');

      const spokenEn = cleanTextForSpeech('The average speed is $v = \\frac{s}{t}$.', 'en');
      expect(spokenEn).toContain('s over t');
      expect(spokenEn).toContain('equals');
    });

    it('converts quadratic powers x^2 and general powers x^n in ID and EN', () => {
      const idInput = 'Persamaan kuadrat $x^2 + 5x + 6 = 0$ memiliki akar real.';
      const idOutput = cleanTextForSpeech(idInput, 'id');
      expect(idOutput).toContain('x kuadrat');
      expect(idOutput).toContain('tambah');
      expect(idOutput).toContain('sama dengan');

      const enInput = 'The equation $x^2 + 5x + 6 = 0$ has real roots.';
      const enOutput = cleanTextForSpeech(enInput, 'en');
      expect(enOutput).toContain('x squared');
      expect(enOutput).toContain('plus');
      expect(enOutput).toContain('equals');
    });

    it('converts square roots \\sqrt{x} and n-th roots in ID and EN', () => {
      const idInput = 'Nilai dari $\\sqrt{16}$ adalah 4.';
      const idOutput = cleanTextForSpeech(idInput, 'id');
      expect(idOutput).toContain('akar 16');

      const enInput = 'The value of $\\sqrt{16}$ is 4.';
      const enOutput = cleanTextForSpeech(enInput, 'en');
      expect(enOutput).toContain('square root of 16');
    });

    it('converts indices and subscripts like a_1 = 7 and S_{10}', () => {
      const idInput = 'Diketahui $a_1 = 7$ dan deret ke-10 adalah $S_{10}$.';
      const idOutput = cleanTextForSpeech(idInput, 'id');
      expect(idOutput).toContain('a satu sama dengan 7');
      expect(idOutput).toContain('S sepuluh');

      const enInput = 'Given $a_1 = 7$ and tenth sum is $S_{10}$.';
      const enOutput = cleanTextForSpeech(enInput, 'en');
      expect(enOutput).toContain('a one equals 7');
      expect(enOutput).toContain('S ten');

      const suInput = 'Kanyahoan $a_1 = 7$ jeung $S_{10}$.';
      const suOutput = cleanTextForSpeech(suInput, 'su');
      expect(suOutput).toContain('a hiji sami sareng 7');
      expect(suOutput).toContain('S sapuluh');
    });

    it('converts Greek letters, comparisons, and arithmetic operators', () => {
      const idInput = 'Sudut $\\theta \\le \\pi$ dan $\\alpha \\approx 3.14$.';
      const idOutput = cleanTextForSpeech(idInput, 'id');
      expect(idOutput).toContain('teta');
      expect(idOutput).toContain('kurang dari atau sama dengan');
      expect(idOutput).toContain('pi');
      expect(idOutput).toContain('alfa');
      expect(idOutput).toContain('mendekati');

      const enInput = 'Angle $\\theta \\le \\pi$ and $\\alpha \\approx 3.14$.';
      const enOutput = cleanTextForSpeech(enInput, 'en');
      expect(enOutput).toContain('theta');
      expect(enOutput).toContain('less than or equal to');
      expect(enOutput).toContain('pi');
      expect(enOutput).toContain('alpha');
      expect(enOutput).toContain('approximately equals');
    });
  });

  describe('Markdown and Code Stripping for Speech', () => {
    it('strips nexora-node code blocks, markdown bold, headers, and bullet markers', () => {
      const markdown = `
# Pembahasan Matematika

Berikut adalah langkah-langkahnya:
* **Langkah 1:** Identifikasi variabel awal.
* **Langkah 2:** Gunakan rumus $S_n = \\frac{n}{2}(2a_1 + (n-1)d)$.

\`\`\`nexora-node
{"action": "create_node", "title": "Calculated Result", "latex": "S_{10} = 205"}
\`\`\`

Silakan tanyakan jika ada langkah yang belum jelas!
`;

      const spoken = cleanTextForSpeech(markdown, 'id');
      expect(spoken).not.toContain('#');
      expect(spoken).not.toContain('**');
      expect(spoken).not.toContain('```');
      expect(spoken).not.toContain('create_node');
      expect(spoken).toContain('Pembahasan Matematika');
      expect(spoken).toContain('Langkah 1: Identifikasi variabel awal.');
      expect(spoken).toContain('n per 2');
      expect(spoken).toContain('Silakan tanyakan jika ada langkah yang belum jelas!');
    });
  });

  describe('useTextToSpeech Hook Sentence Queue & Abort Cancellation', () => {
    it('queues sentences and cleans speech when stopped', () => {
      // Mock window.speechSynthesis
      const cancelMock = vi.fn();
      const speakMock = vi.fn();
      const getVoicesMock = vi.fn(() => []);

      (window as unknown as Record<string, unknown>).speechSynthesis = {
        cancel: cancelMock,
        speak: speakMock,
        getVoices: getVoicesMock,
        pause: vi.fn(),
        resume: vi.fn(),
      };
      (window as unknown as Record<string, unknown>).SpeechSynthesisUtterance = function (text: string) {
        return { text, lang: 'id-ID' };
      };

      const { result } = renderHook(() => useTextToSpeech());
      expect(result.current.isSupported).toBe(true);

      act(() => {
        result.current.queueSentence('Kalimat pertama.');
        result.current.queueSentence('Kalimat kedua.');
      });

      expect(speakMock).toHaveBeenCalled();

      act(() => {
        result.current.stop();
      });

      expect(cancelMock).toHaveBeenCalled();
      expect(result.current.isPlaying).toBe(false);
      expect(result.current.activeText).toBeNull();
    });
  });
});
