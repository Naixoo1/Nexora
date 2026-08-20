/**
 * High-Availability AI Resilience Architecture & Multi-Key API Pool.
 * Manages valid model cascades, API key pooling with rotation, and BYOK (Bring Your Own Key).
 */

export const VALID_MODELS = [
  'gemini-2.5-flash',
  'gemini-1.5-flash',
  'gemini-2.5-pro',
  'gemini-1.5-pro',
] as const;

export type ValidGeminiModel = (typeof VALID_MODELS)[number];

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

  // 1. Custom client-provided BYOK key
  if (customKey && typeof customKey === 'string') {
    const trimmed = customKey.trim();
    if (trimmed.length > 5 && trimmed !== 'undefined' && trimmed !== 'null') {
      pool.push(trimmed);
    }
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
