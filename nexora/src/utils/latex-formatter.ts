/**
 * LaTeX Pre-Processor & Normalizer.
 * Cleans, normalizes, and repairs LaTeX mathematical formatting, delimiters,
 * bracket/parenthesis expressions, and double-escaped backslashes before
 * passing text to Markdown and KaTeX renderers.
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
 * Determines whether an inner string represents a mathematical expression, condition, or formula.
 */
export function isMathExpression(str: string): boolean {
  if (!str) return false;
  const trimmed = str.trim();

  // If already wrapped in dollar signs, do not double-wrap
  if (trimmed.startsWith('$') && trimmed.endsWith('$')) return false;

  // Contains LaTeX backslash commands: \frac, \neq, \sqrt, \alpha, \theta, etc.
  if (/\\[a-zA-Z]+/.test(trimmed)) return true;

  // Contains exponents or subscripts: a^{x}, a^x, x_i, x^2
  if (/[\w\(\)]+[\^_]\{?[^}\s]+\}?/.test(trimmed)) return true;

  // Contains math comparisons or relations: a > 1, x < 5, a = b, 0 < a < 1, a != 1, f(x) = ...
  if (/[=><+\-*\/]/.test(trimmed)) {
    // Exclude normal prose sentences with words longer than 4 characters
    const words = trimmed.split(/[^a-zA-Z]+/).filter(Boolean);
    const hasLongWord = words.some((w) => w.length > 4);
    if (!hasLongWord && words.length > 0) return true;
  }

  return false;
}

/**
 * Determines whether a parenthesized string should be wrapped as inline math ($...$).
 * Targets expressions like (a>1), (0<a<1), (a^{x}), (\frac{1}{2}, 0, 1), ((a>0)), ((a\neq1)).
 */
function shouldWrapParenthesesAsMath(inner: string): boolean {
  if (!inner) return false;
  const trimmed = inner.trim();

  // Already wrapped in dollar signs
  if (trimmed.startsWith('$') && trimmed.endsWith('$')) return false;

  // Contains comparison / equality operators: a>1, 0<a<1, x=2, a\neq1, a\le1, a\ge1
  if (/[=><]/.test(trimmed) || /\\(neq|le|ge|leq|geq|approx|sim|equiv)/.test(trimmed)) {
    const words = trimmed.split(/[^a-zA-Z]+/).filter(Boolean);
    return !words.some((w) => w.length > 4);
  }

  // Contains fractions or radical expressions: \frac{1}{2}, \frac12, \sqrt{2}
  if (/\\(frac|sqrt|cfrac|dfrac)/.test(trimmed)) return true;

  // Contains isolated exponents: a^{x}, a^x, 2^n
  if (/^[a-zA-Z0-9]+[\^_]\{?[^}\s]+\}?$/.test(trimmed)) return true;

  return false;
}

/**
 * Sanitizes and repairs mismatched or orphaned \left and \right delimiter pairs,
 * and strips stray orphaned LaTeX commands leaking into text.
 * e.g. `2a_1 + (n-1)d\right` -> `2a_1 + (n-1)d`
 * e.g. `\left[ 2a_1 + (n-1)d \right` -> `[ 2a_1 + (n-1)d ]`
 */
export function sanitizeLeftRightBrackets(str: string): string {
  if (!str || (!str.includes('\\left') && !str.includes('\\right'))) {
    return str;
  }

  let text = str;

  // 1. Remove lone \right or \left keywords followed by whitespace, punctuation, or end of string with no delimiter attached
  text = text.replace(/\\(left|right)\s*(?=[$\n,;><=]|$)/g, '');

  // 2. Balance paired \left<delim> and \right<delim>
  const leftMatches = text.match(/\\left\s*([()[\]{}|./]|\\[a-zA-Z]+)/g) || [];
  const rightMatches = text.match(/\\right\s*([()[\]{}|./]|\\[a-zA-Z]+)/g) || [];

  // If more \right than \left, strip the extra \right prefixes
  if (rightMatches.length > leftMatches.length) {
    let extra = rightMatches.length - leftMatches.length;
    text = text.replace(/\\right\s*([()[\]{}|./]|\\[a-zA-Z]+)/g, (match, delim) => {
      if (extra > 0) {
        extra--;
        return delim === '.' ? '' : delim;
      }
      return match;
    });
  }

  // If more \left than \right, strip the extra \left prefixes
  if (leftMatches.length > rightMatches.length) {
    let extra = leftMatches.length - rightMatches.length;
    text = text.replace(/\\left\s*([()[\]{}|./]|\\[a-zA-Z]+)/g, (match, delim) => {
      if (extra > 0) {
        extra--;
        return delim === '.' ? '' : delim;
      }
      return match;
    });
  }

  // 3. Clean any remaining lone \right or \left keywords not followed by valid delimiters
  text = text.replace(/\\(left|right)(?![()[\]{}|./\\a-zA-Z])/g, '');

  return text;
}

/**
 * Cleans math inner string from shorthand artifacts (e.g. `,;` -> `, `, `\frac12` -> `\frac{1}{2}`).
 */
export function cleanMathFormula(formula: string): string {
  let f = normalizeMathBackslashes(formula.trim());
  f = sanitizeLeftRightBrackets(f);

  // Fix shorthand fractions: \frac12 -> \frac{1}{2}
  f = f.replace(/\\frac(\d)(\d)/g, '\\frac{$1}{$2}');

  // Fix stray semicolons and commas: ,; -> , and normalize comma spacing
  f = f.replace(/,\s*;/g, ', ').replace(/;\s*,/g, ', ');
  f = f.replace(/,\s*/g, ', ');

  // Strip accidental outer wrapping dollar signs
  if (f.startsWith('$') && f.endsWith('$')) {
    f = f.slice(1, -1).trim();
  }

  return f;
}

/**
 * Normalizes lines with jammed or unclosed $$ delimiters, splitting equations and prose onto clean lines.
 */
function normalizeJammedMathLines(text: string): string {
  const lines = text.split('\n');
  const normalizedLines: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine.includes('$$') || trimmedLine === '$$') {
      normalizedLines.push(line);
      continue;
    }

    // Clean runaway consecutive dollars ($$$$, $$$$$$, etc.)
    const cleanedLine = line.replace(/\${3,}/g, () => '$$');
    const parts = cleanedLine.split('$$');

    // If it's a simple standalone display math line like `$$formula$$`
    if (parts.length === 3 && parts[0].trim() === '' && parts[2].trim() === '') {
      normalizedLines.push(`$$${cleanMathFormula(parts[1])}$$`);
      continue;
    }

    const resultSegments: string[] = [];
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const trimmed = part.trim();
      if (!trimmed) continue;

      if (isMathExpression(trimmed)) {
        resultSegments.push(`$$\n${cleanMathFormula(trimmed)}\n$$`);
      } else {
        resultSegments.push(trimmed);
      }
    }

    if (resultSegments.length > 0) {
      normalizedLines.push(resultSegments.join('\n\n'));
    }
  }

  return normalizedLines.join('\n');
}

/**
 * Scans for standalone algebraic lines containing obvious math variables and operators
 * that were emitted without delimiters (e.g. `2a_1 + (n-1)d` or `S_n = \frac{n}{2}(2a_1 + (n-1)d)`)
 * and wraps them in clean $$ ... $$ blocks.
 */
function wrapUndelimitedMathLines(text: string): string {
  const lines = text.split('\n');
  const processedLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip empty lines, lines already containing math delimiters, markdown headers, lists, code fences
    if (
      !trimmed ||
      trimmed.startsWith('#') ||
      trimmed.startsWith('```') ||
      trimmed.startsWith('- ') ||
      trimmed.startsWith('* ') ||
      trimmed.startsWith('> ') ||
      trimmed.startsWith('1.') ||
      trimmed.startsWith('2.') ||
      trimmed.startsWith('3.') ||
      trimmed.includes('$$') ||
      (trimmed.startsWith('$') && trimmed.endsWith('$'))
    ) {
      processedLines.push(line);
      continue;
    }

    // Check if the entire line looks like a mathematical equation or formula
    if (
      /^[a-zA-Z0-9\s()_^{}\\+*\/=><\-.,|]+$/.test(trimmed) &&
      isMathExpression(trimmed) &&
      !trimmed.includes('http')
    ) {
      // Ensure it doesn't contain normal prose words (> 4 chars)
      const words = trimmed.split(/[^a-zA-Z]+/).filter(Boolean);
      const longWords = words.filter((w) => w.length > 4);
      if (longWords.length === 0 && words.length > 0) {
        processedLines.push(`\n$$\n${cleanMathFormula(trimmed)}\n$$\n`);
        continue;
      }
    }

    processedLines.push(line);
  }

  return processedLines.join('\n');
}

/**
 * Pre-processes and normalizes LaTeX and Markdown math delimiters and escape sequences.
 * - Resolves jammed or unclosed display math delimiters (e.g. `formula $$ text $$ formula`)
 * - Cleans runaway dollar signs (e.g. `$$$$$$` -> `$$\n\n`)
 * - Converts bracket display math `[ ... ]` and `\\[ ... \\]` to clean `$$\n...\n$$` display blocks
 * - Converts `(( ... ))` and `( ... )` containing math to `($ ... $)`
 * - Converts `\\( ... \\)` to `$ ... $` inline math
 * - Repairs double-escaped LaTeX commands (`\\\\frac` -> `\frac`)
 * - Cleans template/JSON bracket artifacts (`{{ //`, `{{ ... }}`)
 * - Sanitizes orphaned \left / \right bracket commands
 * - Wraps undelimited standalone algebraic lines in $$ ... $$
 */
export function preprocessLatex(content: string): string {
  if (!content || typeof content !== 'string') return '';

  let text = content.replace(/\r\n/g, '\n');

  // 1. Sanitize orphaned \left / \right brackets across the raw text first
  text = sanitizeLeftRightBrackets(text);

  // 2. Normalize jammed $$ delimiters, unclosed math, and runaway dollar signs
  text = normalizeJammedMathLines(text);

  // 3. Clean accidental double-curly bracket JSON/template artifacts: {{ // or {{ ... }}
  text = text.replace(/\{\{\s*\/\/\s*/g, '');
  text = text.replace(/\{\{([\s\S]*?)\}\}/g, (match, inner) => {
    if (inner.includes('\\') || inner.includes('=') || inner.includes('^') || inner.includes('_')) {
      return `{${inner}}`;
    }
    return match;
  });

  // 4. Convert standard bracket display math \[ ... \] to newline-padded $$ ... $$ blocks
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_match, formula) => {
    const cleanFormula = cleanMathFormula(formula);
    return `\n\n$$\n${cleanFormula}\n$$\n\n`;
  });

  // 5. Convert standalone bracket math [ ... ] to $$ ... $$ (exclude \left[ / \right], markdown links [title](url), and citations [[node:...]])
  text = text.replace(/(?<!\\left\s*)(?<!\[)\[(?!\s*\[)([^\[\]\n]+?)(?<!\\right\s*)\](?!\s*[\(\]])/g, (match, inner) => {
    const trimmed = inner.trim();
    // Exclude task checkboxes [ ] or [x]
    if (trimmed === '' || trimmed === 'x' || trimmed === 'X') {
      return match;
    }
    if (isMathExpression(trimmed)) {
      const cleanFormula = cleanMathFormula(trimmed);
      return `\n\n$$\n${cleanFormula}\n$$\n\n`;
    }
    return match;
  });

  // 6. Convert double parenthesized math (( ... )) to ($ ... $)
  text = text.replace(/\(\(\s*([^()]+?)\s*\)\)/g, (match, inner) => {
    if (isMathExpression(inner)) {
      const cleanFormula = cleanMathFormula(inner);
      return `($${cleanFormula}$)`;
    }
    return match;
  });

  // 7. Convert bracket inline math \( ... \) to single dollar signs $ ... $
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_match, formula) => {
    const cleanFormula = cleanMathFormula(formula);
    return `$${cleanFormula}$`;
  });

  // 8. Convert single parenthesized math ( ... ) to ($ ... $) where applicable (exclude inside LaTeX formula constructs)
  text = text.replace(/(?<![a-zA-Z0-9\\\$_{^])\(\s*([^()\n]+?)\s*\)(?![a-zA-Z0-9\\\$_{^])/g, (match, inner) => {
    if (shouldWrapParenthesesAsMath(inner)) {
      const cleanFormula = cleanMathFormula(inner);
      return `($${cleanFormula}$)`;
    }
    return match;
  });

  // 9. Wrap undelimited standalone math lines
  text = wrapUndelimitedMathLines(text);

  // 10. Ensure display math blocks ($$...$$) have clean newline separation if attached to text
  text = text.replace(/([^\n])\n\$\$([^\n]+?)\$\$/g, (_match, before, formula) => {
    const cleanFormula = cleanMathFormula(formula);
    return `${before}\n\n$$${cleanFormula}$$`;
  });

  // 11. Normalize inline math $ ... $ backslashes while avoiding standalone currency symbols
  text = text.replace(/(?<!\$)\$(?!\$)(.+?)(?<!\$)\$(?!\$)/g, (match, formula) => {
    // If it looks like currency ($100, $5.50, $20 million) without operators, leave as is
    if (/^\s*\d+(\.\d+)?\s*(USD|usd|million|k|billion)?\s*$/.test(formula)) {
      return match;
    }
    const cleanFormula = cleanMathFormula(formula);
    return `$${cleanFormula}$`;
  });

  // 12. Clean up excessive whitespace around display math
  text = text.replace(/\n{3,}\$\$/g, () => '\n\n$$');
  text = text.replace(/\$\$\n{3,}/g, () => '$$\n\n');

  return text;
}

/**
 * Converts raw LaTeX mathematical formulas and syntax into clean, natural plain text
 * suitable for spoken conversation and subtitle display in AI Call Mode.
 * e.g., "\frac{n}{2}(2a + (n-1)b)" -> "n/2 * (2a + (n-1)b)"
 *       "$S_n = \frac{n}{2} [2a + (n-1)b]$" -> "Sn = n/2 * (2a + (n-1)b)"
 *       "\sqrt{x^2 + y^2}" -> "akar(x^2 + y^2)"
 */
export function formatMathForVoice(text: string): string {
  if (!text || typeof text !== 'string') return '';

  let s = text;

  // 1. Remove code fences and raw nexora-node blocks
  s = s.replace(/```(?:nexora-node|node|json|typescript|javascript|python)?[\s\S]*?```/gi, '');
  s = s.replace(/`([^`]+)`/g, '$1');

  // 2. Fractions: \frac{a}{b} -> a/b
  while (/\\frac\{([^{}]+)\}\{([^{}]+)\}/.test(s)) {
    s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, (_match, num, den) => {
      return `${num.trim()} / ${den.trim()}`;
    });
  }

  // 3. Roots: \sqrt[n]{x} -> akar pangkat n(x) or akar(x)
  s = s.replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, 'akar pangkat $1($2)');
  s = s.replace(/\\sqrt\{([^}]+)\}/g, 'akar($1)');
  s = s.replace(/\\sqrt\s*([a-zA-Z0-9]+)/g, 'akar($1)');

  // 4. Exponents & powers: x^{2} -> x^2
  s = s.replace(/\^\{([^}]+)\}/g, '^$1');

  // 5. Subscripts: S_{n} -> Sn, a_{1} -> a1, U_n -> Un
  s = s.replace(/([a-zA-Z]+)_\{?([a-zA-Z0-9]+)\}?/g, '$1$2');

  // 6. Multiplication and division operators
  s = s.replace(/\\cdot|\\times|\\ast/g, ' * ');
  s = s.replace(/\\div/g, ' / ');
  s = s.replace(/\\pm/g, ' ± ');
  s = s.replace(/\\leq|\\le/g, ' <= ');
  s = s.replace(/\\geq|\\ge/g, ' >= ');
  s = s.replace(/\\neq|\\ne/g, ' != ');
  s = s.replace(/\\approx/g, ' ≈ ');
  s = s.replace(/\\equiv/g, ' ≡ ');
  s = s.replace(/\\to|\\rightarrow/g, ' -> ');
  s = s.replace(/\\infty/g, ' tak hingga ');

  // 7. Delimiters and latex brackets
  s = s.replace(/\\left[\[\(\{]/g, '(').replace(/\\right[\]\)\}]/g, ')');
  s = s.replace(/\\text\{([^}]+)\}/g, '$1');
  s = s.replace(/\\mathrm\{([^}]+)\}/g, '$1');
  s = s.replace(/\\mathbf\{([^}]+)\}/g, '$1');

  // 8. Strip dollar signs $ and $$ and \( \) \[ \]
  s = s.replace(/\$+/g, '');
  s = s.replace(/\\\[|\\\]|\\\(|\\\)/g, '');

  // 9. Strip remaining stray backslashes
  s = s.replace(/\\/g, '');

  // 10. Normalize multiple spaces
  s = s.replace(/[ \t]+/g, ' ');

  return s.trim();
}
