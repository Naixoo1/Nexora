/**
 * Model cascade priority list and resilient retry helpers for Gemini API calls.
 */

/**
 * Resolves the resilient model cascade priority list.
 * Deduplicates candidates while preserving priority order.
 */
export function getModelCascade(): string[] {
  const envModel = process.env.GEMINI_MODEL;
  const candidates = [
    envModel,
    'gemini-2.5-flash',
    'gemini-1.5-flash',
    'gemini-2.5-pro',
    'gemini-1.5-pro',
  ].filter((m): m is string => Boolean(m && m.trim() && !m.includes('3.6')));

  return Array.from(new Set(candidates));
}

/**
 * Checks if an error is transient or model-not-found (e.g. 404 Not Found, 503 high demand, 429 rate limit, 500/502/504 server overload).
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
    str.includes('429') ||
    str.includes('resource_exhausted') ||
    str.includes('rate_limit') ||
    str.includes('quota') ||
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
export async function delayWithJitter(baseMs = 400, jitterMs = 200): Promise<void> {
  const ms = baseMs + Math.random() * jitterMs;
  return new Promise((resolve) => setTimeout(resolve, ms));
}
