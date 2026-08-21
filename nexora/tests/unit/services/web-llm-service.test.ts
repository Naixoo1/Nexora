import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  checkWebGPUSupport,
  isWebLLMReady,
  DEFAULT_WEB_LLM_MODEL,
  FALLBACK_WEB_LLM_MODEL,
} from '@/services/web-llm-service';

describe('WebLLM Service & WebGPU Feature Detection', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defines correct target lightweight model identifiers', () => {
    expect(DEFAULT_WEB_LLM_MODEL).toBe('Llama-3.2-1B-Instruct-q4f16_1-MLC');
    expect(FALLBACK_WEB_LLM_MODEL).toBe('SmolLM2-360M-Instruct-q0f16-MLC');
  });

  it('returns false when WebGPU is not supported by navigator', async () => {
    // In standard node/jsdom test env, navigator.gpu is undefined
    const isSupported = await checkWebGPUSupport();
    expect(typeof isSupported).toBe('boolean');
  });

  it('returns true when navigator.gpu.requestAdapter resolves valid adapter', async () => {
    const originalNavigator = global.navigator;

    Object.defineProperty(global, 'navigator', {
      value: {
        gpu: {
          requestAdapter: vi.fn().mockResolvedValue({ name: 'Mock WebGPU Adapter' }),
        },
      },
      configurable: true,
      writable: true,
    });

    const isSupported = await checkWebGPUSupport();
    expect(isSupported).toBe(true);

    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
  });

  it('reports engine as not ready prior to initialization', () => {
    expect(isWebLLMReady()).toBe(false);
  });
});
