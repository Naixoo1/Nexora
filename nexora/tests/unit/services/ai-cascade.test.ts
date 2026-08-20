import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getModelCascade, isTransientError, delayWithJitter } from '@/services/ai-cascade';

describe('AI Cascade & Resilience Service', () => {
  const originalEnvModel = process.env.GEMINI_MODEL;

  afterEach(() => {
    process.env.GEMINI_MODEL = originalEnvModel;
  });

  describe('getModelCascade', () => {
    it('should filter out invalid 3.6 models and default to gemini-2.5-flash as primary candidate', () => {
      process.env.GEMINI_MODEL = 'gemini-3.6-flash';
      const cascade = getModelCascade();

      expect(cascade[0]).toBe('gemini-2.5-flash');
      expect(cascade).not.toContain('gemini-3.6-flash');
      expect(cascade).toContain('gemini-1.5-flash');
      expect(cascade).toContain('gemini-2.5-pro');
      expect(cascade).toContain('gemini-1.5-pro');

      // Check deduplication
      const uniqueSet = new Set(cascade);
      expect(uniqueSet.size).toBe(cascade.length);
    });

    it('should use valid GEMINI_MODEL when properly configured', () => {
      process.env.GEMINI_MODEL = 'gemini-2.5-pro';
      const cascade = getModelCascade();

      expect(cascade[0]).toBe('gemini-2.5-pro');
      expect(cascade).toContain('gemini-2.5-flash');
      const count = cascade.filter((m) => m === 'gemini-2.5-pro').length;
      expect(count).toBe(1);
    });

    it('should deduplicate when GEMINI_MODEL matches one of the fallbacks', () => {
      process.env.GEMINI_MODEL = 'gemini-2.5-flash';
      const cascade = getModelCascade();

      expect(cascade[0]).toBe('gemini-2.5-flash');
      const count = cascade.filter((m) => m === 'gemini-2.5-flash').length;
      expect(count).toBe(1);
    });

    it('should provide robust default list when GEMINI_MODEL is unset', () => {
      delete process.env.GEMINI_MODEL;
      const cascade = getModelCascade();

      expect(cascade.length).toBeGreaterThanOrEqual(4);
      expect(cascade[0]).toBe('gemini-2.5-flash');
    });
  });

  describe('isTransientError', () => {
    it('should return true for 404 / NOT_FOUND invalid model errors', () => {
      const err1 = new Error('404 Not Found: models/gemini-3.6-flash is not found for api version v1beta');
      expect(isTransientError(err1)).toBe(true);

      const err2 = new Error('NOT_FOUND: The requested model does not exist');
      expect(isTransientError(err2)).toBe(true);
    });

    it('should return true for 503 high demand errors', () => {
      const err = new Error('503 Service Unavailable: This model is currently experiencing high demand.');
      expect(isTransientError(err)).toBe(true);
    });

    it('should return true for 429 rate limit / quota errors', () => {
      const err = new Error('429 RESOURCE_EXHAUSTED: Rate limit exceeded for default quota.');
      expect(isTransientError(err)).toBe(true);
    });

    it('should return true for 500 / 502 / 504 server overload errors', () => {
      expect(isTransientError(new Error('500 Internal Server Error'))).toBe(true);
      expect(isTransientError(new Error('502 Bad Gateway: Upstream overloaded'))).toBe(true);
      expect(isTransientError(new Error('504 Gateway Timeout'))).toBe(true);
    });

    it('should return false for client input validation or auth errors', () => {
      expect(isTransientError(new Error('Invalid argument: missing prompt field'))).toBe(false);
      expect(isTransientError(new Error('API key not valid. Please pass a valid API key.'))).toBe(false);
    });

    it('should handle non-Error objects safely', () => {
      expect(isTransientError('404 model not found')).toBe(true);
      expect(isTransientError('503 model overloaded')).toBe(true);
      expect(isTransientError(null)).toBe(false);
      expect(isTransientError(undefined)).toBe(false);
    });
  });

  describe('delayWithJitter', () => {
    it('should delay for approximately the specified duration', async () => {
      const start = Date.now();
      await delayWithJitter(50, 20);
      const duration = Date.now() - start;
      expect(duration).toBeGreaterThanOrEqual(45);
    });
  });
});
