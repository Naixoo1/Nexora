import { describe, it, expect } from 'vitest';
import { preprocessLatex, normalizeMathBackslashes } from '@/utils/latex-formatter';
import { cleanMarkdownText } from '@/components/chat/MarkdownRenderer';

describe('LaTeX Pre-Processor & Normalizer', () => {
  describe('normalizeMathBackslashes', () => {
    it('normalizes double-escaped backslashes for common LaTeX operators', () => {
      expect(normalizeMathBackslashes('\\\\frac{a}{b}')).toBe('\\frac{a}{b}');
      expect(normalizeMathBackslashes('\\\\sqrt{x^2 + y^2}')).toBe('\\sqrt{x^2 + y^2}');
      expect(normalizeMathBackslashes('\\\\int_{0}^{\\\\infty} e^{-x} \\\\, dx')).toBe(
        '\\int_{0}^{\\infty} e^{-x} \\, dx'
      );
    });

    it('preserves matrix/align row breaks while fixing commands', () => {
      const matrix = 'a & b \\\\\\\\ c & d';
      expect(normalizeMathBackslashes(matrix)).toBe('a & b \\\\ c & d');
    });
  });

  describe('preprocessLatex', () => {
    it('converts bracket display math \\[ ... \\] to $$ display blocks', () => {
      const input = 'Here is the quadratic formula:\n\\[ x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a} \\]';
      const output = preprocessLatex(input);

      expect(output).toContain('$$\nx = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}\n$$');
      expect(output).not.toContain('\\[');
      expect(output).not.toContain('\\]');
    });

    it('converts bracket inline math \\( ... \\) to single dollar signs $ ... $', () => {
      const input = 'Let \\( x \\in \\mathbb{R} \\) and \\( f(x) = x^2 \\).';
      const output = preprocessLatex(input);

      expect(output).toBe('Let $x \\in \\mathbb{R}$ and $f(x) = x^2$.');
      expect(output).not.toContain('\\(');
      expect(output).not.toContain('\\)');
    });

    it('repairs double-escaped backslashes inside display and inline math', () => {
      const input = 'Solve for \\( \\\\theta \\):\n\\[ \\\\sin^2(\\\\theta) + \\\\cos^2(\\\\theta) = 1 \\]';
      const output = preprocessLatex(input);

      expect(output).toContain('$\\theta$');
      expect(output).toContain('$$\n\\sin^2(\\theta) + \\cos^2(\\theta) = 1\n$$');
      expect(output).not.toContain('\\\\sin');
    });

    it('cleans stray template tags and double-curly braces', () => {
      const input = '{{ // formula }}\n$$\n{{ x^2 + y^2 = r^2 }}\n$$';
      const output = preprocessLatex(input);

      expect(output).not.toContain('{{ //');
      expect(output).toContain('x^2 + y^2 = r^2');
    });

    it('handles regular text with currency without corrupting it', () => {
      const input = 'The price of textbook is $100 and formula is \\( x = 5 \\).';
      const output = preprocessLatex(input);

      expect(output).toContain('$100');
      expect(output).toContain('$x = 5$');
    });
  });

  describe('cleanMarkdownText in MarkdownRenderer', () => {
    it('integrates LaTeX pre-processing with header normalization', () => {
      const raw = '### **Formula Derivation**\n\\[ E = mc^2 \\]';
      const cleaned = cleanMarkdownText(raw);

      expect(cleaned).toContain('### Formula Derivation');
      expect(cleaned).toContain('$$\nE = mc^2\n$$');
      expect(cleaned).not.toContain('\\[');
    });
  });
});
