import { redis } from '@/lib/redis';
import type { Redis } from '@upstash/redis';

export const CACHE_TTL_SECONDS = 604800; // 7 days in seconds
export const CACHE_PREFIX = 'nexora:chat:cache:v1:';

/**
 * Normalizes a prompt by lowercasing, stripping extra punctuation and collapsing whitespace.
 */
export function normalizePrompt(prompt: string): string {
  if (!prompt || typeof prompt !== 'string') return '';
  return prompt
    .toLowerCase()
    .trim()
    .replace(/[^\w\s\d]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Computes a SHA-256 hex digest using Web Crypto API.
 */
export async function hashStringSHA256(text: string): Promise<string> {
  if (!text) return '0000000000000000000000000000000000000000000000000000000000000000';

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback hash implementation for environments without WebCrypto
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

/**
 * Generates a deterministic SHA-256 cache key for a prompt and tutor mode.
 */
export async function generatePromptCacheKey(
  prompt: string,
  mode: string = 'socratic'
): Promise<string> {
  const normalized = normalizePrompt(prompt);
  const normalizedMode = (mode || 'socratic').toLowerCase().trim();
  const hash = await hashStringSHA256(`${normalizedMode}:${normalized}`);
  return `${CACHE_PREFIX}${normalizedMode}:${hash}`;
}

/**
 * Checks whether a request is eligible for caching.
 * Excludes requests with custom BYOK API keys, file attachments, or empty prompts.
 */
export function isCacheEligible(
  prompt: string,
  hasAttachments: boolean,
  hasCustomKey: boolean
): boolean {
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return false;
  }
  if (hasAttachments || hasCustomKey) {
    return false;
  }
  return true;
}

/**
 * Retrieves cached response from Upstash Redis.
 * Gracefully non-blocking: fails open (returns null) on error, missing config, or timeout.
 */
export async function getCachedResponse(
  cacheKey: string,
  customClient?: Redis | null
): Promise<string | null> {
  const client = customClient !== undefined ? customClient : redis;
  if (!client || !cacheKey) {
    return null;
  }

  try {
    const cached = await client.get<string>(cacheKey);
    if (typeof cached === 'string' && cached.trim().length > 0) {
      return cached;
    }
    return null;
  } catch (error) {
    console.warn('[AI Cache Lookup Warning]: Failed to fetch from Redis, failing open:', error);
    return null;
  }
}

/**
 * Writes response to Upstash Redis with a TTL of 7 days (604,800 seconds).
 * Gracefully non-blocking: executes in the background without throwing errors.
 */
export async function setCachedResponse(
  cacheKey: string,
  responseText: string,
  ttlSeconds: number = CACHE_TTL_SECONDS,
  customClient?: Redis | null
): Promise<void> {
  const client = customClient !== undefined ? customClient : redis;
  if (!client || !cacheKey || !responseText || !responseText.trim()) {
    return;
  }

  try {
    await client.set(cacheKey, responseText, {
      ex: ttlSeconds,
    });
  } catch (error) {
    console.warn('[AI Cache Write Warning]: Failed to write response to Redis, failing open:', error);
  }
}
