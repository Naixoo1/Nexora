/**
 * Client-Side In-Browser AI Inference via WebLLM (@mlc-ai/web-llm).
 * Enables zero-latency, private on-device LLM generation using WebGPU.
 * Dynamically imported to ensure 100% Next.js SSR build safety.
 */

export const DEFAULT_WEB_LLM_MODEL = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';
export const FALLBACK_WEB_LLM_MODEL = 'SmolLM2-360M-Instruct-q0f16-MLC';

export interface WebLLMProgressReport {
  text: string;
  progress: number; // 0.0 to 1.0
}

export type WebLLMProgressCallback = (report: WebLLMProgressReport) => void;

interface MLCEngineType {
  chat: {
    completions: {
      create(request: {
        messages: Array<{ role: string; content: string }>;
        stream: true;
        temperature?: number;
        max_tokens?: number;
      }): Promise<AsyncIterable<{ choices: Array<{ delta: { content?: string } }> }>>;
    };
  };
  unload(): Promise<void>;
}

let cachedEngine: MLCEngineType | null = null;
let currentModelLoaded: string | null = null;
let isEngineLoading = false;

/**
 * Checks whether the current browser environment supports WebGPU.
 */
export async function checkWebGPUSupport(): Promise<boolean> {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  try {
    const nav = navigator as unknown as { gpu?: { requestAdapter?: () => Promise<unknown> } };
    if (!nav.gpu || typeof nav.gpu.requestAdapter !== 'function') {
      return false;
    }
    const adapter = await nav.gpu.requestAdapter();
    return Boolean(adapter);
  } catch (error) {
    console.warn('[WebLLM Check] WebGPU detection error:', error);
    return false;
  }
}

/**
 * Returns whether the WebLLM engine is actively loaded and ready for inference.
 */
export function isWebLLMReady(): boolean {
  return cachedEngine !== null;
}

/**
 * Returns the name of the currently loaded model.
 */
export function getLoadedModelName(): string | null {
  return currentModelLoaded;
}

/**
 * Initializes and caches the WebLLM MLCEngine instance in browser memory.
 */
export async function initWebLLMEngine(
  model: string = DEFAULT_WEB_LLM_MODEL,
  onProgress?: WebLLMProgressCallback
): Promise<MLCEngineType> {
  if (typeof window === 'undefined') {
    throw new Error('WebLLM can only be initialized on the client side.');
  }

  if (cachedEngine && currentModelLoaded === model) {
    if (onProgress) {
      onProgress({ text: 'Model ready in GPU cache', progress: 1.0 });
    }
    return cachedEngine;
  }

  if (isEngineLoading) {
    // Wait for in-progress load
    while (isEngineLoading) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (cachedEngine) return cachedEngine;
  }

  isEngineLoading = true;

  try {
    const isSupported = await checkWebGPUSupport();
    if (!isSupported) {
      throw new Error('WebGPU is not supported or enabled on this browser/device.');
    }

    // Dynamic import to prevent Node/Edge SSR runtime evaluation
    const { CreateMLCEngine } = await import('@mlc-ai/web-llm');

    const engine = await CreateMLCEngine(model, {
      initProgressCallback: (report) => {
        if (onProgress) {
          onProgress({
            text: report.text || 'Loading on-device model...',
            progress: typeof report.progress === 'number' ? report.progress : 0,
          });
        }
      },
    });

    cachedEngine = engine as unknown as MLCEngineType;
    currentModelLoaded = model;
    isEngineLoading = false;

    if (onProgress) {
      onProgress({ text: 'On-device AI ready', progress: 1.0 });
    }

    return cachedEngine;
  } catch (error) {
    isEngineLoading = false;
    cachedEngine = null;
    currentModelLoaded = null;
    console.error('[WebLLM Init Error]: Failed to initialize engine:', error);
    throw error;
  }
}

/**
 * Streams completion tokens from the local on-device WebGPU model.
 */
export async function streamLocalCompletion(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  onChunk: (delta: string) => void,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    onProgress?: WebLLMProgressCallback;
  }
): Promise<string> {
  const modelToUse = options?.model || DEFAULT_WEB_LLM_MODEL;
  const engine = await initWebLLMEngine(modelToUse, options?.onProgress);

  const asyncChunks = await engine.chat.completions.create({
    messages,
    stream: true,
    temperature: options?.temperature ?? 0.5,
    max_tokens: options?.maxTokens ?? 1500,
  });

  let fullResponse = '';

  for await (const chunk of asyncChunks) {
    const delta = chunk.choices[0]?.delta?.content || '';
    if (delta) {
      fullResponse += delta;
      onChunk(delta);
    }
  }

  return fullResponse;
}

/**
 * Unloads the local WebGPU model from VRAM.
 */
export async function unloadWebLLMEngine(): Promise<void> {
  if (cachedEngine) {
    try {
      await cachedEngine.unload();
    } catch (err) {
      console.warn('[WebLLM Unload Warning]:', err);
    }
    cachedEngine = null;
    currentModelLoaded = null;
  }
}
