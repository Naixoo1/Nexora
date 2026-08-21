/**
 * Reasoning Sanitizer & Stream Filter.
 * Strips internal chain-of-thought tokens, `<think>...</think>` tags, and reasoning deltas
 * to ensure that internal model monologue is never leaked to the client.
 */

/**
 * Strips `<think>...</think>` blocks and meta-dialogues from a completed string.
 */
export function sanitizeReasoningContent(text: string): string {
  if (!text || typeof text !== 'string') return '';

  return text
    // Strip complete <think>...</think> blocks
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    // Strip unclosed <think> blocks if stream was truncated
    .replace(/<think>[\s\S]*$/gi, '')
    // Strip standalone closing </think> tags
    .replace(/<\/think>/gi, '')
    .trim();
}

/**
 * Creates a stateful TransformStream that strips `<think>...</think>` blocks on the fly.
 */
export function createReasoningFilterTransform(): TransformStream<string, string> {
  let isThinking = false;
  let buffer = '';

  return new TransformStream<string, string>({
    transform(chunk, controller) {
      buffer += chunk;

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
        if (!isThinking) {
          controller.enqueue(buffer);
        } else {
          const clean = sanitizeReasoningContent(buffer);
          if (clean) controller.enqueue(clean);
        }
      }
      buffer = '';
    },
  });
}
