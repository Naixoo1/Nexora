import { describe, it, expect, afterEach } from 'vitest';
import {
  getModelCascade,
  getApiKeyPool,
  isKeyExhaustedOrInvalid,
  isTransientError,
  delayWithJitter,
  pruneConversationHistory,
  VALID_MODELS,
  OPENROUTER_MODELS,
  GROQ_MODELS,
} from '@/services/ai-cascade';

describe('AI Cascade & Multi-Provider Architecture', () => {
  const originalEnvModel = process.env.GEMINI_MODEL;
  const originalEnvKey = process.env.GEMINI_API_KEY;
  const originalEnvKeys = process.env.GEMINI_API_KEYS;
  const originalGroqKey = process.env.GROQ_API_KEY;

  afterEach(() => {
    process.env.GEMINI_MODEL = originalEnvModel;
    process.env.GEMINI_API_KEY = originalEnvKey;
    process.env.GEMINI_API_KEYS = originalEnvKeys;
    process.env.GROQ_API_KEY = originalGroqKey;
  });

  describe('getModelCascade', () => {
    it('should strictly filter out experimental or non-existent 3.x models', () => {
      process.env.GEMINI_MODEL = 'gemini-3.6-flash';
      const cascade = getModelCascade();

      expect(cascade[0]).toBe('gemini-2.5-flash');
      expect(cascade).not.toContain('gemini-3.6-flash');
      expect(cascade).toEqual(VALID_MODELS);
    });

    it('should prioritize valid GEMINI_MODEL when recognized in VALID_MODELS', () => {
      process.env.GEMINI_MODEL = 'gemini-2.5-pro';
      const cascade = getModelCascade();

      expect(cascade[0]).toBe('gemini-2.5-pro');
      expect(cascade).toContain('gemini-2.5-flash');
      const count = cascade.filter((m) => m === 'gemini-2.5-pro').length;
      expect(count).toBe(1);
    });

    it('should fallback cleanly to VALID_MODELS when GEMINI_MODEL is empty', () => {
      delete process.env.GEMINI_MODEL;
      const cascade = getModelCascade();

      expect(cascade.length).toBe(4);
      expect(cascade[0]).toBe('gemini-2.5-flash');
    });
  });

  describe('getApiKeyPool', () => {
    it('should prioritize custom client BYOK key if provided', () => {
      process.env.GEMINI_API_KEY = 'env-server-key-12345';
      const pool = getApiKeyPool('custom-user-key-67890');

      expect(pool[0]).toBe('custom-user-key-67890');
      expect(pool).toContain('env-server-key-12345');
    });

    it('should parse comma-separated GEMINI_API_KEYS and single GEMINI_API_KEY', () => {
      process.env.GEMINI_API_KEYS = 'key-alpha-11111, key-beta-22222 , key-gamma-33333';
      process.env.GEMINI_API_KEY = 'key-delta-44444';

      const pool = getApiKeyPool();

      expect(pool).toEqual([
        'key-alpha-11111',
        'key-beta-22222',
        'key-gamma-33333',
        'key-delta-44444',
      ]);
    });

    it('should deduplicate identical keys and filter placeholders', () => {
      process.env.GEMINI_API_KEYS = 'duplicate-key-99999, your-gemini-api-key, duplicate-key-99999';
      process.env.GEMINI_API_KEY = 'duplicate-key-99999';

      const pool = getApiKeyPool();

      expect(pool).toEqual(['duplicate-key-99999']);
    });

    it('should return empty array if no valid keys are found', () => {
      delete process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEYS;

      const pool = getApiKeyPool(null);
      expect(pool).toEqual([]);
    });
  });

  describe('OpenRouter Fallback Models', () => {
    it('should include free tier OpenRouter inference models', () => {
      expect(OPENROUTER_MODELS).toContain('openrouter/free');
      expect(OPENROUTER_MODELS).toContain('meta-llama/llama-3.3-70b-instruct:free');
      expect(OPENROUTER_MODELS).toContain('google/gemini-2.0-flash-exp:free');
      expect(OPENROUTER_MODELS).toContain('openrouter/auto');
    });
  });

  describe('Groq Fallback Models', () => {
    it('should include high-speed Groq inference models', () => {
      expect(GROQ_MODELS).toContain('llama-3.3-70b-versatile');
      expect(GROQ_MODELS).toContain('llama-3.1-70b-versatile');
      expect(GROQ_MODELS).toContain('llama-3.1-8b-instant');
    });
  });

  describe('Smart History Pruning (pruneConversationHistory)', () => {
    it('should limit conversation history to the last 6 messages', () => {
      const longHistory = Array.from({ length: 12 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message turn ${i + 1}`,
      }));

      const pruned = pruneConversationHistory(longHistory, 6);
      expect(pruned).toHaveLength(6);
      expect(pruned[0].content).toBe('Message turn 7');
      expect(pruned[5].content).toBe('Message turn 12');
    });

    it('should strip heavy base64 media and canvas node snapshots from older turns', () => {
      const messagesWithMedia = [
        {
          role: 'user',
          content: 'Here is my diagram: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA... and note.',
        },
        {
          role: 'assistant',
          content: 'I analyzed it. ```nexora-node { "title": "Old Step" } ``` Next question?',
        },
        {
          role: 'user',
          content: 'Current question with data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA... active.',
        },
      ];

      const cleaned = pruneConversationHistory(messagesWithMedia, 6);
      expect(cleaned).toHaveLength(3);
      expect(cleaned[0].content).toBe('Here is my diagram: [Attached Media] and note.');
      expect(cleaned[1].content).toBe('I analyzed it. [Canvas Node Snapshot] Next question?');
      // Latest message kept intact
      expect(cleaned[2].content).toContain('data:image/png;base64');
    });
  });

  describe('isKeyExhaustedOrInvalid', () => {
    it('should return true for 429 quota exhaustion and resource exhausted errors', () => {
      expect(isKeyExhaustedOrInvalid(new Error('429 RESOURCE_EXHAUSTED: Rate limit exceeded.'))).toBe(true);
      expect(isKeyExhaustedOrInvalid(new Error('Quota exceeded for metric: generatetext'))).toBe(true);
    });

    it('should return true for 403 / 401 invalid API key and permission errors', () => {
      expect(isKeyExhaustedOrInvalid(new Error('403 Forbidden: API key not valid.'))).toBe(true);
      expect(isKeyExhaustedOrInvalid(new Error('PERMISSION_DENIED: The caller does not have permission'))).toBe(true);
      expect(isKeyExhaustedOrInvalid(new Error('401 UNAUTHENTICATED: Invalid API key provided'))).toBe(true);
    });

    it('should return false for transient server errors or model errors', () => {
      expect(isKeyExhaustedOrInvalid(new Error('503 Service Unavailable'))).toBe(false);
      expect(isKeyExhaustedOrInvalid(new Error('404 Not Found: model does not exist'))).toBe(false);
    });
  });

  describe('isTransientError', () => {
    it('should return true for 404 model errors and 503 high demand errors', () => {
      expect(isTransientError(new Error('404 Not Found: model not found'))).toBe(true);
      expect(isTransientError(new Error('503 Service Unavailable: High demand'))).toBe(true);
      expect(isTransientError(new Error('500 Internal Server Error'))).toBe(true);
    });

    it('should return false for general client input errors', () => {
      expect(isTransientError(new Error('Invalid JSON payload'))).toBe(false);
    });
  });

  describe('delayWithJitter', () => {
    it('should delay for approximately the specified duration', async () => {
      const start = Date.now();
      await delayWithJitter(40, 20);
      const duration = Date.now() - start;
      expect(duration).toBeGreaterThanOrEqual(35);
    });
  });

  describe('createReasoningFilterTransform stream flush', () => {
    it('should flush remaining buffered non-thinking text when stream closes', async () => {
      const { createReasoningFilterTransform } = await import('@/services/reasoning-sanitizer');
      const readable = new ReadableStream<string>({
        start(controller) {
          controller.enqueue('Berikut ');
          controller.enqueue('adalah ');
          controller.enqueue('solusi');
          controller.close();
        },
      });

      const filtered = readable.pipeThrough(createReasoningFilterTransform());
      const reader = filtered.getReader();
      let result = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) result += value;
      }

      expect(result).toBe('Berikut adalah solusi');
    });
  });
});
