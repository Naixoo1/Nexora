/**
 * Reasoning Sanitizer & Stream Filter.
 * Strips internal chain-of-thought tokens, `<think>...</think>` tags, plain-text monologue preambles,
 * and reasoning deltas to ensure that internal model reasoning is never leaked to the client.
 */

/**
 * Strips leading plain-text chain-of-thought and monologue preambles
 * like "Here's a thinking process:", "1. Analyze User Input:", "Let's check the rules:".
 */
export function stripPlainTextMonologue(text: string): string {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text.trim();

  // Monologue Header & CoT Indicators
  const monologueHeaderPattern =
    /^(#{1,4}\s*)?(\*{0,2})(Here'?s (a |my )?thinking process|Thinking Process|Internal Monologue|Chain-of-Thought|Let'?s (check the rules|analyze|draft a response|break down)|Identify Persona|We need to respond in|Guidelines to follow)(\*{0,2}):?/i;

  const numberedCotPattern =
    /^(\*{0,2})(\d+\.|\*|-)\s*(\*{0,2})(Analyze|Understand|Identify|Check|Determine|Formulate|Draft|Translate|Plan|Rules?|Persona|Response Strategy|User Intent|Target Audience)\b/i;

  if (monologueHeaderPattern.test(cleaned) || numberedCotPattern.test(cleaned)) {
    // Split into paragraphs (separated by 2 or more newlines)
    const paragraphs = cleaned.split(/\n\s*\n+/);
    let firstRealIndex = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i].trim();
      const isMonologueParagraph =
        monologueHeaderPattern.test(p) ||
        numberedCotPattern.test(p) ||
        /^(The user is asking|I should respond in|The prompt asks for|My role is|Make sure to|Don't forget to|Output strictly)\b/i.test(
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
          /^((#{1,4}\s*)?(\*{0,2})(Here'?s (a |my )?thinking process|Thinking Process|Let'?s check the rules|Let'?s analyze|\d+\.\s*(\*{0,2})(Analyze|Identify|Check|Determine))[\s\S]*?)(?=\n\n(Halo|Sampurasun|Hello|Hai|Selamat|Dear|[A-Z][a-z]+|\$\$|#{1,3}\s+[A-Z]|\$[a-zA-Z0-9]))/i,
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
 * Strips `<think>...</think>` blocks, reasoning tags, and plain-text monologue from a completed string.
 */
export function sanitizeReasoningContent(text: string): string {
  if (!text || typeof text !== 'string') return '';

  let result = text
    // 1. Strip complete <think>...</think> blocks
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    // 2. Strip unclosed <think> blocks if stream was truncated
    .replace(/<think>[\s\S]*$/gi, '')
    // 3. Strip standalone closing </think> tags
    .replace(/<\/think>/gi, '')
    .trim();

  // 4. Strip plain-text monologue blocks
  result = stripPlainTextMonologue(result);

  return result;
}

/**
 * Creates a stateful TransformStream that strips `<think>...</think>` blocks
 * and leading plain-text monologue on the fly.
 */
export function createReasoningFilterTransform(): TransformStream<string, string> {
  let isThinking = false;
  let isCheckingPreamble = true;
  let buffer = '';

  const monologuePrefixCheck =
    /^(?:#{1,4}\s*)?(?:\*{0,2})(?:Here'?s (?:a |my )?thinking process|Thinking Process|Internal Monologue|Chain-of-Thought|Let'?s (?:check the rules|analyze|draft)|1\.\s*(?:\*{0,2})Analyze)/i;

  return new TransformStream<string, string>({
    transform(chunk, controller) {
      buffer += chunk;

      // Handle leading plain-text monologue detection at start of stream
      if (isCheckingPreamble) {
        if (monologuePrefixCheck.test(buffer.trim())) {
          // If a monologue preamble is detected, wait until double newline / end of monologue
          const doubleNewlineIdx = buffer.indexOf('\n\n');
          if (doubleNewlineIdx !== -1) {
            const potentialMonologue = buffer.slice(0, doubleNewlineIdx);
            const remaining = buffer.slice(doubleNewlineIdx + 2);

            // Check if remaining still looks like monologue
            if (!monologuePrefixCheck.test(remaining.trim())) {
              buffer = remaining.trimStart();
              isCheckingPreamble = false;
            }
          }
          return;
        } else if (buffer.length > 40 || buffer.includes('\n')) {
          // No monologue detected at beginning
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
        const clean = sanitizeReasoningContent(buffer);
        if (clean) controller.enqueue(clean);
      }
      buffer = '';
    },
  });
}
