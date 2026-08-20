/**
 * High-Availability AI Resilience Architecture, Multi-Key API Pool, and Multi-Provider Cascade.
 * Manages valid model cascades, API key pooling with rotation, BYOK (Bring Your Own Key),
 * OpenRouter free tier fallback, Groq fallback engine, and smart conversation history pruning.
 */

export const VALID_MODELS = [
  'gemini-2.5-flash',
  'gemini-1.5-flash',
  'gemini-2.5-pro',
  'gemini-1.5-pro',
] as const;

export type ValidGeminiModel = (typeof VALID_MODELS)[number];

export const OPENROUTER_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemini-2.0-flash-exp:free',
  'meta-llama/llama-3.1-8b-instruct:free',
  'openrouter/auto',
] as const;

export type ValidOpenRouterModel = (typeof OPENROUTER_MODELS)[number];

export const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-70b-versatile',
  'llama-3.1-8b-instant',
] as const;

export type ValidGroqModel = (typeof GROQ_MODELS)[number];

export interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export type GroqChatMessage = ChatCompletionMessage;
export type OpenRouterChatMessage = ChatCompletionMessage;

/**
 * Resolves the resilient model cascade priority list.
 * Strictly sanitizes candidates to active production Gemini identifiers.
 */
export function getModelCascade(): string[] {
  const envModel = process.env.GEMINI_MODEL?.trim();
  const candidates: string[] = [];

  if (envModel && (VALID_MODELS as readonly string[]).includes(envModel)) {
    candidates.push(envModel);
  }

  candidates.push(...VALID_MODELS);
  return Array.from(new Set(candidates));
}

/**
 * Resolves the active pool of Gemini API keys.
 * Prioritizes client-provided BYOK keys (`x-gemini-api-key`),
 * then parses comma-separated `GEMINI_API_KEYS` and single `GEMINI_API_KEY`.
 */
export function getApiKeyPool(customKey?: string | null): string[] {
  const pool: string[] = [];

  const hasClientKey = Boolean(
    customKey &&
    typeof customKey === 'string' &&
    customKey.trim().length > 5 &&
    customKey.trim() !== 'undefined' &&
    customKey.trim() !== 'null'
  );

  console.log(`[AI Cascade] Client BYOK header present: ${hasClientKey}`);

  // 1. Custom client-provided BYOK key is placed as Index 0
  if (hasClientKey && customKey) {
    pool.push(customKey.trim());
  }

  // 2. Comma-separated GEMINI_API_KEYS list
  const multiKeys = process.env.GEMINI_API_KEYS;
  if (multiKeys && typeof multiKeys === 'string') {
    const split = multiKeys
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 5 && !k.startsWith('your-'));
    pool.push(...split);
  }

  // 3. Single GEMINI_API_KEY fallback
  const singleKey = process.env.GEMINI_API_KEY;
  if (singleKey && typeof singleKey === 'string') {
    const trimmed = singleKey.trim();
    if (trimmed.length > 5 && !trimmed.startsWith('your-')) {
      pool.push(trimmed);
    }
  }

  return Array.from(new Set(pool));
}

/**
 * Streams completion from OpenRouter API (OpenAI-compatible SSE stream).
 * Primary fallback model: `meta-llama/llama-3.3-70b-instruct:free`.
 */
export async function streamOpenRouterCompletion(
  messages: OpenRouterChatMessage[],
  model: string = 'meta-llama/llama-3.3-70b-instruct:free',
  apiKey?: string
): Promise<ReadableStream<string>> {
  const key = apiKey || process.env.OPENROUTER_API_KEY;
  if (!key || key.trim() === '' || key.startsWith('your-')) {
    throw new Error('Missing or unconfigured OPENROUTER_API_KEY for fallback engine.');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key.trim()}`,
      'HTTP-Referer': 'https://nexora.vercel.app',
      'X-Title': 'Nexora AI',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`OpenRouter API returned HTTP ${response.status}: ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Unable to read stream from OpenRouter API.');
  }

  const decoder = new TextDecoder();

  return new ReadableStream<string>({
    async start(controller) {
      let buffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(':')) continue;
            if (trimmed === 'data: [DONE]') {
              controller.close();
              return;
            }
            if (trimmed.startsWith('data: ')) {
              try {
                const data = JSON.parse(trimmed.slice(6));
                const delta = data.choices?.[0]?.delta?.content || '';
                if (delta) {
                  controller.enqueue(delta);
                }
              } catch {
                // Ignore parse errors on partial chunks
              }
            }
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

/**
 * Streams completion from Groq's high-speed inference API (OpenAI-compatible SSE stream).
 */
export async function streamGroqCompletion(
  messages: GroqChatMessage[],
  model: string = 'llama-3.3-70b-versatile',
  apiKey?: string
): Promise<ReadableStream<string>> {
  const key = apiKey || process.env.GROQ_API_KEY;
  if (!key || key.trim() === '' || key.startsWith('your-')) {
    throw new Error('Missing or unconfigured GROQ_API_KEY for fallback engine.');
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Groq API returned HTTP ${response.status}: ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Unable to read stream from Groq API.');
  }

  const decoder = new TextDecoder();

  return new ReadableStream<string>({
    async start(controller) {
      let buffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(':')) continue;
            if (trimmed === 'data: [DONE]') {
              controller.close();
              return;
            }
            if (trimmed.startsWith('data: ')) {
              try {
                const data = JSON.parse(trimmed.slice(6));
                const delta = data.choices?.[0]?.delta?.content || '';
                if (delta) {
                  controller.enqueue(delta);
                }
              } catch {
                // Ignore parse errors on partial chunks
              }
            }
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

/**
 * Smart history pruning:
 * - Limits conversation turns to the last `maxMessages` (default 6).
 * - Strips heavy base64 data payloads from older turns to prevent token bloat.
 */
export function pruneConversationHistory<T extends { role: string; content: string }>(
  messages: T[],
  maxMessages: number = 6
): T[] {
  if (!messages || messages.length === 0) return [];

  // Take the most recent maxMessages
  const recent = messages.slice(-maxMessages);

  // Clean heavy base64 data URIs and node snapshots from older history
  return recent.map((msg, idx) => {
    // If it's the last message (current turn), keep content intact
    if (idx === recent.length - 1) return msg;

    // For older messages, strip any data:image or data:application base64 data
    const strippedContent = msg.content
      .replace(/data:[^;]+;base64,[A-Za-z0-9+/=.]+/g, '[Attached Media]')
      .replace(/```nexora-node[\s\S]*?```/g, '[Canvas Node Snapshot]');

    return {
      ...msg,
      content: strippedContent,
    };
  });
}

/**
 * Checks if an error is an API key exhaustion, quota limit, or authentication failure
 * requiring immediate rotation to the next API key in the pool.
 */
export function isKeyExhaustedOrInvalid(error: unknown): boolean {
  if (!error) return false;
  const str = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    str.includes('429') ||
    str.includes('resource_exhausted') ||
    str.includes('quota') ||
    str.includes('rate_limit') ||
    str.includes('403') ||
    str.includes('permission_denied') ||
    str.includes('api key not valid') ||
    str.includes('invalid_api_key') ||
    str.includes('unauthenticated') ||
    str.includes('401')
  );
}

/**
 * Checks if an error is transient or model-specific (e.g. 404 Not Found, 503 high demand, 500/502/504 server overload).
 */
export function isTransientError(error: unknown): boolean {
  if (!error) return false;
  const str = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    str.includes('404') ||
    str.includes('not found') ||
    str.includes('not_found') ||
    str.includes('is not found for api version') ||
    str.includes('models/') ||
    str.includes('503') ||
    str.includes('unavailable') ||
    str.includes('high demand') ||
    str.includes('500') ||
    str.includes('502') ||
    str.includes('504') ||
    str.includes('overloaded') ||
    str.includes('temporarily') ||
    str.includes('try again') ||
    str.includes('econnreset') ||
    str.includes('fetch failed')
  );
}

/**
 * Applies a randomized jitter delay for resilient exponential / linear backoff.
 */
export async function delayWithJitter(baseMs = 300, jitterMs = 150): Promise<void> {
  const ms = baseMs + Math.random() * jitterMs;
  return new Promise((resolve) => setTimeout(resolve, ms));
}
