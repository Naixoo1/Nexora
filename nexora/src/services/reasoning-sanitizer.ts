/**
 * Reasoning Sanitizer & Stream Filter.
 * Strips internal chain-of-thought tokens, `<think>...</think>` tags, plain-text monologue preambles,
 * conversational scratchpads, pseudo-code math notations, leaked safety tokens/metadata,
 * and reasoning deltas to ensure that internal model reasoning or evaluation artifacts
 * are never leaked to the client.
 */

/**
 * Strips leaked internal safety tags, safety evaluation ratings, guardrail metadata,
 * and classifier tokens from LLM responses.
 * e.g., "user safety:safe", "safety_rating: safe", "safety: safe", "[safety: safe]",
 * "Input Safety: Safe", "Safety Assessment: Safe", "Content Safety: safe".
 */
export function stripSafetyMetadata(text: string): string {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text;

  // 1. Bracketed safety tags: [safety: safe], [user safety: safe], [Safety: None]
  cleaned = cleaned.replace(/\[\s*(?:user\s*)?safety(?:_rating)?\s*:[^\]]+\]/gi, '');

  // 2. Standalone line starts: "user safety:safe", "safety: safe", "Input Safety: Safe", "Safety Assessment: Safe"
  cleaned = cleaned.replace(/^(?:(?:Input|Content|Prompt|User|Context)\s+)?safety(?:_rating)?\s*:[^\n]*$/gim, '');
  cleaned = cleaned.replace(/^safety\s*(?:assessment|check)\s*:[^\n]*$/gim, '');
  cleaned = cleaned.replace(/^content\s*filter\s*:[^\n]*$/gim, '');

  // 3. Inline safety tokens: "user safety:safe", "user safety: safe", "safety: safe"
  cleaned = cleaned.replace(/\b(?:user\s*)?safety(?:_rating)?\s*:\s*\w+\b/gi, '');

  // Clean up any remaining multiple empty newlines at boundaries
  return cleaned.replace(/^\s*\n+/, '').trim();
}

/**
 * Normalizes raw pseudo-code math expressions into standard KaTeX LaTeX.
 * e.g. `log_2(x^2 - 5x + 6)` -> `$\log_2(x^2 - 5x + 6)$`
 *      `log_b(a)` -> `$\log_{b}(a)$`
 */
export function normalizePseudoCodeMath(text: string): string {
  if (!text || typeof text !== 'string') return '';

  let output = text;

  // Replace standalone raw log_b(...) or log_2(...) outside LaTeX $ delimiters
  output = output.replace(
    /(?<!\$|\\)\blog_([0-9a-zA-Z]+)\(([^)]+)\)(?!\$)/g,
    '$\\log_{$1}($2)$'
  );

  // Replace standalone raw sqrt(...) outside LaTeX delimiters
  output = output.replace(
    /(?<!\$|\\)\bsqrt\(([^)]+)\)(?!\$)/g,
    '$\\sqrt{$1}$'
  );

  return output;
}

/**
 * Strips leading plain-text chain-of-thought, monologue preambles, and conversational scratchpads
 * like "Let's do: ...", "Or better, a problem that...", "Actually, let's make it a bit more interesting and Socratic...",
 * "I'll present the problem, then ask...", "1. Analyze User Input:", "Let's check the rules:".
 */
export function stripPlainTextMonologue(text: string): string {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text.trim();

  // 1. Direct inline/prefix stripping for explicit tags
  cleaned = cleaned
    .replace(
      /^(?:#{1,4}[^\S\r\n]*)?(?:\*{0,2})(?:Drafting the Content\s*(?:\([^)]*\))?|Mental Refinement|Drafting response|Internal Monologue|Thinking Process|Analyzing the request|Let's think|Planning response)(?:\*{0,2}):?[^\S\r\n]*[^\n]*(?:\r?\n+|$)/i,
      ''
    )
    .trim();

  // Strip any residual inline "(Mental Refinement):" or "Drafting the Content (Mental Refinement):"
  cleaned = cleaned
    .replace(/(?:\*{0,2})(?:Drafting the Content\s*(?:\([^)]*\))?|Mental Refinement)(?:\*{0,2}):?[^\S\r\n]*/gi, '')
    .trim();

  // 2. Planning monologue and scratchpad pattern
  // Matches LLMs brainstorming what problem to give before the actual question/answer
  const planningPrefixPattern =
    /^(?:(?:Let'?s\s+(?:do|create|give|provide|make|present|craft|think|design|come up with|start with|check|analyze|draft|break down)|Or better|Actually,?\s+let'?s|I\s+(?:will|shall|can|need to|should|am going to|plan to)|I'?ll\s+(?:present|give|ask|provide|guide|create|start|show|introduce)|The user\s+(?:just|is|wants|asked|said|provided)|Planning\s+(?:response|a problem|the next step|the solution)|Response Strategy|Let'?s see|To make it (?:more )?Socratic)[\s\S]*?)(?=(?:\r?\n)+(?:Berikut|Tentu|Halo|Sampurasun|Hello|Hai|Selamat|Selesaikan|Soal|Pertanyaan|Mari|Silakan|Tentukan|Berapakah|Berapa|Diketahui|Carilah|Hitunglah|Simak|Perhatikan|Catatan|#|\$\$|\$[a-zA-Z0-9]|[A-Z][a-z]+(?:\s+[a-z]+){2,}:?|$))/i;

  if (planningPrefixPattern.test(cleaned)) {
    cleaned = cleaned.replace(planningPrefixPattern, '').trim();
  }

  // Monologue Header & CoT Indicators
  const monologueHeaderPattern =
    /^(#{1,4}\s*)?(\*{0,2})(Here'?s (a |my )?thinking process|Thinking Process|Internal Monologue|Chain-of-Thought|Let'?s (do|check the rules|analyze|draft a response|break down|think|create|give|present|make|craft)|Or better|Actually,?\s+let'?s|I (will|shall|am going to|plan to)|I'?ll (present|give|ask|provide|guide|create)|The user (just|is|wants|asked|said)|Planning (response|a problem)|Drafting the Content|Mental Refinement|Analyzing the request|Identify Persona|We need to respond in|Guidelines to follow)(\*{0,2}):?/i;

  const numberedCotPattern =
    /^(\*{0,2})(\d+\.|\*|-)\s*(\*{0,2})(Analyze|Understand|Identify|Check|Determine|Formulate|Draft|Translate|Plan|Rules?|Persona|Response Strategy|User Intent|Target Audience|Mental Refinement|Drafting)\b/i;

  if (monologueHeaderPattern.test(cleaned) || numberedCotPattern.test(cleaned)) {
    // Split into paragraphs (separated by 2 or more newlines)
    const paragraphs = cleaned.split(/\n\s*\n+/);
    let firstRealIndex = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i].trim();
      const isMonologueParagraph =
        monologueHeaderPattern.test(p) ||
        numberedCotPattern.test(p) ||
        /^(The user is asking|I should respond in|The prompt asks for|My role is|Make sure to|Don't forget to|Output strictly|Drafting the Content|Mental Refinement|Let'?s do|Or better|Actually,?\s+let'?s|I'?ll present|I will provide|To make it (?:more )?Socratic)\b/i.test(
          p
        ) ||
        /^(Let'?s draft|Drafting response|Now formulating|Final response):?$/i.test(p);

      if (isMonologueParagraph) {
        firstRealIndex = i + 1;
      } else {
        break;
      }
    }

    if (firstRealIndex > 0 && firstRealIndex < paragraphs.length) {
      cleaned = paragraphs.slice(firstRealIndex).join('\n\n').trim();
    } else {
      // If paragraphs didn't cleanly split, use regex lookahead for real content start
      cleaned = cleaned
        .replace(
          /^((#{1,4}\s*)?(\*{0,2})(Here'?s (a |my )?thinking process|Thinking Process|Let'?s (check the rules|analyze|do|think|create)|Or better|Actually,?\s+let'?s|I (will|shall|plan to)|I'?ll (present|give)|Drafting the Content|Mental Refinement|\d+\.\s*(\*{0,2})(Analyze|Identify|Check|Determine))[\s\S]*?)(?=\n+(Halo|Sampurasun|Hello|Hai|Selamat|Dear|Berikut|Tentu|Selesaikan|Soal|Mari|Silakan|Tentukan|[A-Z][a-z]+|\$\$|#{1,3}\s+[A-Z]|\$[a-zA-Z0-9]))/i,
          ''
        )
        .trim();
    }
  }

  // Strip any lingering "Final response:" or "Here is the response:" headers
  cleaned = cleaned
    .replace(/^(\*{0,2})(Final (Response|Answer|Output)|Here is the response)(\*{0,2}):?\s*/i, '')
    .trim();

  return cleaned;
}

/**
 * Cleans token hallucinations, multilingual bleed (e.g. Chinese/CJK characters
 * leaking into Latin words like "deret几何rinya" -> "deret geometrinya"),
 * and removes rogue foreign script tokens for Latin locales ('id', 'en', 'su').
 */
export function cleanScriptBleed(text: string, locale: string = 'id'): string {
  if (!text || typeof text !== 'string') return '';

  const isLatinLocale = !locale || ['id', 'en', 'su'].some((l) => locale.startsWith(l));
  if (!isLatinLocale) return text;

  let cleaned = text;

  // 1. Replace known multilingual subword token leaks
  // Specifically geometry: deret几何rinya -> deret geometrinya, 几何rinya -> geometrinya, 几何 -> geometri / geometry
  cleaned = cleaned.replace(/([a-zA-Z]+)几何(?=rinya|ri|tri)/gi, '$1 geomet');
  cleaned = cleaned.replace(/几何(?=rinya|ri|tri)/gi, 'geomet');
  cleaned = cleaned.replace(/([a-zA-Z]+)几何/g, (_m, prefix) => `${prefix} ${locale.startsWith('en') ? 'geometry' : 'geometri'}`);
  cleaned = cleaned.replace(/几何/g, locale.startsWith('en') ? 'geometry' : 'geometri');

  // Common STEM terms occasionally emitted by multilingual tokenizers:
  cleaned = cleaned.replace(/([a-zA-Z]+)算术/g, (_m, prefix) => `${prefix} ${locale.startsWith('en') ? 'arithmetic' : 'aritmetika'}`);
  cleaned = cleaned.replace(/算术/g, locale.startsWith('en') ? 'arithmetic' : 'aritmetika');

  cleaned = cleaned.replace(/([a-zA-Z]+)数学/g, (_m, prefix) => `${prefix} ${locale.startsWith('en') ? 'mathematics' : 'matematika'}`);
  cleaned = cleaned.replace(/数学/g, locale.startsWith('en') ? 'mathematics' : 'matematika');

  cleaned = cleaned.replace(/([a-zA-Z]+)函数/g, (_m, prefix) => `${prefix} ${locale.startsWith('en') ? 'function' : 'fungsi'}`);
  cleaned = cleaned.replace(/函数/g, locale.startsWith('en') ? 'function' : 'fungsi');

  cleaned = cleaned.replace(/([a-zA-Z]+)方程/g, (_m, prefix) => `${prefix} ${locale.startsWith('en') ? 'equation' : 'persamaan'}`);
  cleaned = cleaned.replace(/方程/g, locale.startsWith('en') ? 'equation' : 'persamaan');

  cleaned = cleaned.replace(/([a-zA-Z]+)向量/g, (_m, prefix) => `${prefix} ${locale.startsWith('en') ? 'vector' : 'vektor'}`);
  cleaned = cleaned.replace(/向量/g, locale.startsWith('en') ? 'vector' : 'vektor');

  cleaned = cleaned.replace(/([a-zA-Z]+)矩阵/g, (_m, prefix) => `${prefix} ${locale.startsWith('en') ? 'matrix' : 'matriks'}`);
  cleaned = cleaned.replace(/矩阵/g, locale.startsWith('en') ? 'matrix' : 'matriks');

  cleaned = cleaned.replace(/([a-zA-Z]+)概率/g, (_m, prefix) => `${prefix} ${locale.startsWith('en') ? 'probability' : 'peluang'}`);
  cleaned = cleaned.replace(/概率/g, locale.startsWith('en') ? 'probability' : 'peluang');

  cleaned = cleaned.replace(/([a-zA-Z]+)微积分/g, (_m, prefix) => `${prefix} ${locale.startsWith('en') ? 'calculus' : 'kalkulus'}`);
  cleaned = cleaned.replace(/微积分/g, locale.startsWith('en') ? 'calculus' : 'kalkulus');

  cleaned = cleaned.replace(/([a-zA-Z]+)导数/g, (_m, prefix) => `${prefix} ${locale.startsWith('en') ? 'derivative' : 'turunan'}`);
  cleaned = cleaned.replace(/导数/g, locale.startsWith('en') ? 'derivative' : 'turunan');

  cleaned = cleaned.replace(/([a-zA-Z]+)积分/g, (_m, prefix) => `${prefix} ${locale.startsWith('en') ? 'integral' : 'integral'}`);
  cleaned = cleaned.replace(/积分/g, locale.startsWith('en') ? 'integral' : 'integral');

  // 2. Remove any remaining rogue standalone CJK characters for Latin locales
  // CJK Unified Ideographs (\u4e00-\u9fa5), CJK Extension A (\u3400-\u4dbf), Hiragana/Katakana (\u3040-\u30ff), Hangul (\uac00-\ud7af)
  cleaned = cleaned.replace(/[\u4e00-\u9fa5\u3400-\u4dbf\u3040-\u30ff\uac00-\ud7af]/g, '');

  return cleaned;
}

/**
 * Strips `<think>...</think>` blocks, reasoning tags, plain-text monologue,
 * conversational scratchpads, pseudo-code math notation, multilingual script bleeds,
 * and leaked safety tokens from a completed string.
 */
export function sanitizeReasoningContent(text: string, locale: string = 'id'): string {
  if (!text || typeof text !== 'string') return '';

  // 1. Clean multilingual token bleeds (e.g. "deret几何rinya" -> "deret geometrinya")
  let result = cleanScriptBleed(text, locale);

  // 2. Strip leaked safety tokens first so downstream monologue detection sees clean text
  result = stripSafetyMetadata(result);

  // 3. Strip complete <think>...</think> blocks
  result = result
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    // 4. Strip unclosed <think> blocks if stream was truncated
    .replace(/<think>[\s\S]*$/gi, '')
    // 5. Strip standalone closing </think> tags
    .replace(/<\/think>/gi, '')
    .trim();

  // 6. Strip plain-text monologue & conversational scratchpad blocks
  result = stripPlainTextMonologue(result);

  // 7. Normalize raw pseudo-code math expressions (e.g. log_2(...) -> $\log_2(...)$)
  result = normalizePseudoCodeMath(result);

  return result.trim();
}

/**
 * Creates a stateful TransformStream that strips `<think>...</think>` blocks,
 * leading plain-text monologue, script bleed, and leaked safety tokens on the fly.
 */
export function createReasoningFilterTransform(locale: string = 'id'): TransformStream<string, string> {
  let isThinking = false;
  let isCheckingPreamble = true;
  let buffer = '';

  const monologueOrSafetyCheck =
    /^(?:#{1,4}\s*)?(?:\*{0,2})(?:Here'?s (?:a |my )?thinking process|Thinking Process|Internal Monologue|Chain-of-Thought|Let'?s (?:do|check the rules|analyze|draft|think|create|give|present|make|craft)|Or better|Actually,?\s+let'?s|I (?:will|shall|am going to|plan to)|I'?ll (?:present|give|ask|provide|guide|create)|The user (?:just|is|wants|asked|said)|Planning (?:response|a problem)|1\.\s*(?:\*{0,2})Analyze|Drafting the Content|Mental Refinement|Drafting response|Analyzing the request|(?:user\s*)?safety(?:_rating)?\s*:\s*\w+|\[\s*(?:user\s*)?safety(?:_rating)?\s*:\s*[^\]]+\]|(?:Input|Content|Prompt|User|Context)\s*Safety\s*:\s*\w+|Safety\s*Assessment\s*:\s*\w+)/i;

  return new TransformStream<string, string>({
    transform(chunk, controller) {
      const sanitizedChunk = cleanScriptBleed(chunk, locale);
      buffer += sanitizedChunk;

      // Handle leading plain-text monologue or safety header detection at start of stream
      if (isCheckingPreamble) {
        if (monologueOrSafetyCheck.test(buffer.trim())) {
          // If a monologue preamble or safety header is detected, wait until double newline or newline
          const doubleNewlineIdx = buffer.indexOf('\n\n');
          const singleNewlineIdx = buffer.indexOf('\n');
          const splitIdx = doubleNewlineIdx !== -1 ? doubleNewlineIdx : singleNewlineIdx;

          if (splitIdx !== -1) {
            const remaining = buffer.slice(splitIdx + (doubleNewlineIdx !== -1 ? 2 : 1));

            // Check if remaining still looks like monologue or safety
            if (!monologueOrSafetyCheck.test(remaining.trim())) {
              buffer = remaining.replace(/^\s*\n+/, '');
              isCheckingPreamble = false;
            }
          }
          return;
        } else if (buffer.length > 50 || buffer.includes('\n')) {
          // No preamble artifact detected at beginning
          isCheckingPreamble = false;
        } else {
          // Buffer too short to determine, wait for next chunk
          return;
        }
      }

      while (buffer.length > 0) {
        if (!isThinking) {
          const thinkStart = buffer.toLowerCase().indexOf('<think>');
          if (thinkStart === -1) {
            // Check if buffer ends with a partial '<think' prefix
            const partialMatch = buffer.match(/<t(?:h(?:i(?:n(?:k)?)?)?)?$/i);
            if (partialMatch && partialMatch.index !== undefined) {
              const safeText = buffer.slice(0, partialMatch.index);
              if (safeText) controller.enqueue(safeText);
              buffer = buffer.slice(partialMatch.index);
              break;
            } else {
              controller.enqueue(buffer);
              buffer = '';
              break;
            }
          } else {
            // Emit text before <think>
            const textBefore = buffer.slice(0, thinkStart);
            if (textBefore) controller.enqueue(textBefore);
            buffer = buffer.slice(thinkStart + 7); // Skip '<think>'
            isThinking = true;
          }
        } else {
          // Inside <think> block
          const thinkEnd = buffer.toLowerCase().indexOf('</think>');
          if (thinkEnd === -1) {
            // Entire buffer is inside thinking block, discard
            buffer = '';
            break;
          } else {
            // End of thinking block found
            buffer = buffer.slice(thinkEnd + 8); // Skip '</think>'
            isThinking = false;
            // Trim leading newlines after thinking block
            buffer = buffer.replace(/^\n+/, '');
          }
        }
      }
    },
    flush(controller) {
      if (buffer) {
        const clean = sanitizeReasoningContent(buffer, locale);
        if (clean) controller.enqueue(clean);
      }
      buffer = '';
    },
  });
}
