import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  normalizePrompt,
  hashStringSHA256,
  generatePromptCacheKey,
  isCacheEligible,
  getCachedResponse,
  setCachedResponse,
  CACHE_TTL_SECONDS,
  CACHE_PREFIX,
} from '@/services/ai-cache';
import type { Redis } from '@upstash/redis';

describe('AI Cache Service & Upstash Redis Integration', () => {
  describe('normalizePrompt', () => {
    it('lowercases, removes punctuation, and collapses whitespace', () => {
      expect(normalizePrompt("What is Newton's Second Law???")).toBe('what is newtons second law');
      expect(normalizePrompt('   solve   for    x:  2x + 4 = 10!  ')).toBe('solve for x 2x 4 10');
      expect(normalizePrompt('')).toBe('');
    });
  });

  describe('hashStringSHA256', () => {
    it('produces a deterministic 64-character hex hash', async () => {
      const hash1 = await hashStringSHA256('test query');
      const hash2 = await hashStringSHA256('test query');
      const hash3 = await hashStringSHA256('different query');

      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64);
      expect(hash1).not.toBe(hash3);
    });
  });

  describe('generatePromptCacheKey', () => {
    it('generates consistent keys for semantically identical prompts with punctuation differences', async () => {
      const key1 = await generatePromptCacheKey("What is Newton's Second Law?", 'socratic');
      const key2 = await generatePromptCacheKey("what is newtons second law   ", 'socratic');

      expect(key1).toBe(key2);
      expect(key1.startsWith(`${CACHE_PREFIX}socratic:`)).toBe(true);
    });

    it('generates distinct cache keys for different tutor modes', async () => {
      const keySocratic = await generatePromptCacheKey('Explain gravity', 'socratic');
      const keyDirect = await generatePromptCacheKey('Explain gravity', 'direct');

      expect(keySocratic).not.toBe(keyDirect);
      expect(keySocratic.startsWith(`${CACHE_PREFIX}socratic:`)).toBe(true);
      expect(keyDirect.startsWith(`${CACHE_PREFIX}direct:`)).toBe(true);
    });
  });

  describe('isCacheEligible', () => {
    it('returns true for standard queries without attachments and without custom BYOK keys', () => {
      expect(isCacheEligible('Explain gravity in simple terms', false, false)).toBe(true);
    });

    it('returns false when attachments are uploaded', () => {
      expect(isCacheEligible('Explain gravity in simple terms', true, false)).toBe(false);
    });

    it('returns false when custom BYOK key is provided', () => {
      expect(isCacheEligible('Explain gravity in simple terms', false, true)).toBe(false);
    });

    it('returns false for empty or whitespace prompts', () => {
      expect(isCacheEligible('', false, false)).toBe(false);
      expect(isCacheEligible('   ', false, false)).toBe(false);
    });
  });

  describe('getCachedResponse & setCachedResponse (Mock Client)', () => {
    let mockStore: Record<string, string>;
    let mockRedis: Redis;

    beforeEach(() => {
      mockStore = {};
      mockRedis = {
        get: vi.fn(async (key: string) => mockStore[key] || null),
        set: vi.fn(async (key: string, val: string, opts?: { ex?: number }) => {
          mockStore[key] = val;
          return 'OK';
        }),
      } as unknown as Redis;
    });

    it('returns cached text on cache hit', async () => {
      const testKey = 'nexora:chat:cache:v1:socratic:abc12345';
      const cachedText = 'Newton second law states F = ma.';
      mockStore[testKey] = cachedText;

      const result = await getCachedResponse(testKey, mockRedis);
      expect(result).toBe(cachedText);
      expect(mockRedis.get).toHaveBeenCalledWith(testKey);
    });

    it('returns null on cache miss', async () => {
      const testKey = 'nexora:chat:cache:v1:socratic:nonexistent';
      const result = await getCachedResponse(testKey, mockRedis);
      expect(result).toBeNull();
    });

    it('gracefully returns null if Redis throws an error (fail-open)', async () => {
      const faultyRedis = {
        get: vi.fn(async () => {
          throw new Error('Connection timeout');
        }),
      } as unknown as Redis;

      const result = await getCachedResponse('any-key', faultyRedis);
      expect(result).toBeNull();
    });

    it('gracefully returns null if Redis client is null', async () => {
      const result = await getCachedResponse('any-key', null);
      expect(result).toBeNull();
    });

    it('stores response in Redis with 7-day TTL (604,800s)', async () => {
      const testKey = 'nexora:chat:cache:v1:socratic:abc12345';
      const responseText = 'Derivation: F = dp/dt = m*dv/dt = ma.';

      await setCachedResponse(testKey, responseText, CACHE_TTL_SECONDS, mockRedis);

      expect(mockRedis.set).toHaveBeenCalledWith(testKey, responseText, {
        ex: 604800,
      });
      expect(mockStore[testKey]).toBe(responseText);
    });

    it('gracefully ignores errors when writing to Redis fails (fail-open)', async () => {
      const faultyRedis = {
        set: vi.fn(async () => {
          throw new Error('Redis read-only replica error');
        }),
      } as unknown as Redis;

      await expect(
        setCachedResponse('any-key', 'sample text', CACHE_TTL_SECONDS, faultyRedis)
      ).resolves.not.toThrow();
    });
  });
});
