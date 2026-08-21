import { describe, it, expect } from 'vitest';
import {
  preprocessLatex,
  normalizeMathBackslashes,
  isMathExpression,
  cleanMathFormula,
} from '@/utils/latex-formatter';
import { cleanMarkdownText, stripCanvasNodeBlocks } from '@/components/chat/MarkdownRenderer';

describe('LaTeX Pre-Processor & Normalizer Upgrade', () => {
  describe('normalizeMathBackslashes & cleanMathFormula', () => {
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

    it('cleans shorthand fractions and stray semicolons', () => {
      expect(cleanMathFormula('\\frac12,;0,1')).toBe('\\frac{1}{2}, 0, 1');
      expect(cleanMathFormula('\\frac34; , 5')).toBe('\\frac{3}{4}, 5');
    });
  });

  describe('isMathExpression detector', () => {
    it('accurately identifies mathematical expressions and relations', () => {
      expect(isMathExpression('f(x)=a^{x}')).toBe(true);
      expect(isMathExpression('a>0')).toBe(true);
      expect(isMathExpression('a\\neq1')).toBe(true);
      expect(isMathExpression('a>1')).toBe(true);
      expect(isMathExpression('a^{x}')).toBe(true);
      expect(isMathExpression('0<a<1')).toBe(true);
      expect(isMathExpression('\\frac{1}{2}, 0, 1')).toBe(true);
    });

    it('rejects regular natural language words and phrases', () => {
      expect(isMathExpression('contoh')).toBe(false);
      expect(isMathExpression('lihat tabel di atas')).toBe(false);
      expect(isMathExpression('catatan penting')).toBe(false);
      expect(isMathExpression('$a > 0$')).toBe(false); // Already has dollar signs
    });
  });

  describe('preprocessLatex conversions', () => {
    it('normalizes jammed display math and runaway dollar signs on same line', () => {
      const input = 'S_n = \\frac{a(1-r^n)}{1-r} $$ atau setara dengan $$ S_n = \\frac{a(r^n-1)}{r-1} $$$$$$ Langkah-langkah';
      const output = preprocessLatex(input);

      expect(output).toContain('$$\nS_n = \\frac{a(1-r^n)}{1-r}\n$$');
      expect(output).toContain('$$\nS_n = \\frac{a(r^n-1)}{r-1}\n$$');
      expect(output).toContain('atau setara dengan');
      expect(output).not.toContain('$$$$$$');
    });

    it('converts raw standalone bracket math [f(x)=a^{x}] to $$ display blocks', () => {
      const input = 'Fungsi eksponen didefinisikan sebagai:\n[f(x)=a^{x}]';
      const output = preprocessLatex(input);

      expect(output).toContain('$$\nf(x)=a^{x}\n$$');
      expect(output).not.toContain('[f(x)=a^{x}]');
    });

    it('converts double parenthesized math ((a>0)) and ((a\\neq1)) to ($a>0$) and ($a\\neq1$)', () => {
      const input = 'Syarat basis adalah ((a>0)) dan ((a\\neq1)).';
      const output = preprocessLatex(input);

      expect(output).toBe('Syarat basis adalah ($a>0$) dan ($a\\neq1$).');
    });

    it('converts single parenthesized math (a>1) and (a^{x}) to ($a>1$) and ($a^{x}$)', () => {
      const input = 'Untuk kasus (a>1), nilai (a^{x}) selalu bertambah.';
      const output = preprocessLatex(input);

      expect(output).toBe('Untuk kasus ($a>1$), nilai ($a^{x}$) selalu bertambah.');
    });

    it('cleans broken expressions like (\\frac12,;0,1) into ($frac{1}{2}, 0, 1$)', () => {
      const input = 'Titik potong berada pada (\\frac12,;0,1).';
      const output = preprocessLatex(input);

      expect(output).toBe('Titik potong berada pada ($\\frac{1}{2}, 0, 1$).');
    });

    it('normalizes Markdown table cells containing math conditions and formulas', () => {
      const input = `| Syarat Basis | Sifat Grafik |
| :--- | :--- |
| (a>1) | Monoton naik, (a^{x}) membesar |
| (0<a<1) | Monoton turun, (a^{x}) mengecil |`;

      const output = preprocessLatex(input);

      expect(output).toContain('| ($a>1$) | Monoton naik, ($a^{x}$) membesar |');
      expect(output).toContain('| ($0<a<1$) | Monoton turun, ($a^{x}$) mengecil |');
    });

    it('preserves Markdown links [text](url) and citations [[node:...]] without altering them', () => {
      const input = 'Lihat [Dokumentasi Nexora](https://nexora.app) dan rujukan [[node:step-1|Persamaan Awal]].';
      const output = preprocessLatex(input);

      expect(output).toContain('[Dokumentasi Nexora](https://nexora.app)');
      expect(output).toContain('[[node:step-1|Persamaan Awal]]');
    });

    it('preserves task checkbox markers [x] and [ ]', () => {
      const input = '- [x] Selesaikan turunan\n- [ ] Uji titik kritis';
      const output = preprocessLatex(input);

      expect(output).toContain('- [x] Selesaikan turunan');
      expect(output).toContain('- [ ] Uji titik kritis');
    });

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

  describe('stripCanvasNodeBlocks & cleanMarkdownText', () => {
    it('completely strips fenced nexora-node blocks from user markdown', () => {
      const input = `Mari kita turunkan rumusnya:
$$\nS_n = \\frac{n}{2}(a + U_n)\n$$
\`\`\`nexora-node
{
  "title": "Rumus Deret Aritmetika",
  "type": "formula_block",
  "latexFormula": "S_n = \\\\frac{n}{2}(a + U_n)"
}
\`\`\`
Semoga membantu!`;

      const stripped = stripCanvasNodeBlocks(input);
      expect(stripped).toContain('Mari kita turunkan rumusnya:');
      expect(stripped).toContain('S_n = \\frac{n}{2}(a + U_n)');
      expect(stripped).toContain('Semoga membantu!');
      expect(stripped).not.toContain('nexora-node');
      expect(stripped).not.toContain('Rumus Deret Aritmetika');
    });

    it('strips unbackticked raw nexora-node blocks', () => {
      const input = `Penjelasan lengkap.
nexora-node { "title": "Beda Barisan", "type": "reasoning_step", "latexFormula": "b = 5" }`;

      const stripped = stripCanvasNodeBlocks(input);
      expect(stripped).toContain('Penjelasan lengkap.');
      expect(stripped).not.toContain('nexora-node');
      expect(stripped).not.toContain('Beda Barisan');
    });

    it('integrates LaTeX pre-processing with header normalization and node stripping', () => {
      const raw = `### **Formula Derivation**
[f(x) = a^x]
\`\`\`nexora-node
{"title": "Fungsi Eksponen", "latexFormula": "f(x) = a^x"}
\`\`\``;
      const cleaned = cleanMarkdownText(raw);

      expect(cleaned).toContain('### Formula Derivation');
      expect(cleaned).toContain('$$\nf(x) = a^x\n$$');
      expect(cleaned).not.toContain('nexora-node');
      expect(cleaned).not.toContain('[f(x)');
    });
  });
});
