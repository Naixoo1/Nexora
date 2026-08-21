/**
 * LaTeX Pre-Processor & Normalizer.
 * Cleans, normalizes, and repairs LaTeX mathematical formatting, delimiters,
 * and double-escaped backslashes before passing text to Markdown and KaTeX renderers.
 */

/**
 * Standardizes double-escaped backslashes inside mathematical expressions.
 * e.g. `\\\\frac{a}{b}` -> `\\frac{a}{b}`, `\\\\sqrt{x}` -> `\\sqrt{x}`
 */
export function normalizeMathBackslashes(mathStr: string): string {
  if (!mathStr) return '';

  return (
    mathStr
      // Replace 4 or 2 backslashes followed by common LaTeX commands/operators/spaces
      .replace(/\\\\([a-zA-Z,;:!{}|_^])/g, '\\$1')
      // Ensure double backslashes for line breaks in align/matrices are preserved as '\\'
      .replace(/\\\\\\\\/g, '\\\\')
  );
}

/**
 * Pre-processes and normalizes LaTeX and Markdown math delimiters and escape sequences.
 * - Converts `\\[ ... \\]` to clean `$$...$$` display blocks
 * - Converts `\\( ... \\)` to `$ ... $` inline math
 * - Repairs double-escaped LaTeX commands (`\\\\frac` -> `\frac`)
 * - Cleans template/JSON bracket artifacts (`{{ //`, `{{ ... }}`)
 */
export function preprocessLatex(content: string): string {
  if (!content || typeof content !== 'string') return '';

  let text = content.replace(/\r\n/g, '\n');

  // 1. Clean accidental double-curly bracket JSON/template artifacts: {{ // or {{ ... }}
  text = text.replace(/\{\{\s*\/\/\s*/g, '');
  text = text.replace(/\{\{([\s\S]*?)\}\}/g, (match, inner) => {
    if (inner.includes('\\') || inner.includes('=') || inner.includes('^') || inner.includes('_')) {
      return `{${inner}}`;
    }
    return match;
  });

  // 2. Convert standard bracket display math \[ ... \] to newline-padded $$ ... $$ blocks
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_match, formula) => {
    const cleanFormula = normalizeMathBackslashes(formula.trim());
    return `\n\n$$\n${cleanFormula}\n$$\n\n`;
  });

  // 3. Convert standard bracket inline math \( ... \) to single dollar signs $ ... $
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_match, formula) => {
    const cleanFormula = normalizeMathBackslashes(formula.trim());
    return `$${cleanFormula}$`;
  });

  // 4. Ensure display math blocks ($$...$$) have clean newline separation if attached to text
  text = text.replace(/([^\n])\n\$\$([\s\S]*?)\$\$/g, (_match, before, formula) => {
    const cleanFormula = normalizeMathBackslashes(formula);
    return `${before}\n\n$$${cleanFormula}$$`;
  });

  // 5. Normalize inline math $ ... $ backslashes while avoiding standalone currency symbols
  text = text.replace(/(?<!\$)\$(?!\$)(.+?)(?<!\$)\$(?!\$)/g, (match, formula) => {
    // If it looks like currency ($100, $5.50, $20 million) without operators, leave as is
    if (/^\s*\d+(\.\d+)?\s*(USD|usd|million|k|billion)?\s*$/.test(formula)) {
      return match;
    }
    const cleanFormula = normalizeMathBackslashes(formula);
    return `$${cleanFormula}$`;
  });

  return text;
}
