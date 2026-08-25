import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';

class MockSpeechRecognition {
  continuous = true;
  interimResults = true;
  lang = 'id-ID';
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((ev: { error: string }) => void) | null = null;
  onresult: ((ev: {
    resultIndex: number;
    results: Array<Array<{ transcript: string }> & { isFinal?: boolean }>;
  }) => void) | null = null;

  start = vi.fn(() => {
    if (this.onstart) {
      this.onstart();
    }
  });

  stop = vi.fn(() => {
    if (this.onend) {
      this.onend();
    }
  });

  abort = vi.fn(() => {
    if (this.onend) {
      this.onend();
    }
  });
}

describe('useSpeechRecognition Hook', () => {
  let mockInstance: MockSpeechRecognition;

  function MockSpeechRecognitionConstructor(this: unknown) {
    mockInstance = new MockSpeechRecognition();
    return mockInstance;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockInstance = new MockSpeechRecognition();
    (window as unknown as Record<string, unknown>).SpeechRecognition = MockSpeechRecognitionConstructor;
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition = MockSpeechRecognitionConstructor;

    // Mock navigator.mediaDevices.getUserMedia
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }],
        }),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).SpeechRecognition;
    delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
  });

  describe('Microphone Permission & Browser Compatibility', () => {
    it('requests getUserMedia microphone permission before starting SpeechRecognition', async () => {
      const { result } = renderHook(() => useSpeechRecognition());
      expect(result.current.isSupported).toBe(true);

      await act(async () => {
        await result.current.startListening('id-ID');
      });

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
      expect(result.current.isListening).toBe(true);
      expect(result.current.isPermissionDenied).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('handles microphone permission denial gracefully and flags isPermissionDenied', async () => {
      navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue(new Error('Permission denied'));

      const { result } = renderHook(() => useSpeechRecognition());

      await act(async () => {
        await result.current.startListening('id-ID');
      });

      expect(result.current.isListening).toBe(false);
      expect(result.current.isPermissionDenied).toBe(true);
      expect(result.current.error).toContain('Microphone access is required');
    });
  });

  describe('Streaming Speech & Mobile Auto-Restart', () => {
    it('captures interim and final transcripts smoothly', async () => {
      const { result } = renderHook(() => useSpeechRecognition());

      await act(async () => {
        await result.current.startListening('id-ID');
      });

      // Interim chunk
      act(() => {
        mockInstance.onresult?.({
          resultIndex: 0,
          results: [Object.assign([{ transcript: 'Berapa turunan' }], { isFinal: false })],
        });
      });

      expect(result.current.interimTranscript).toBe('Berapa turunan');
      expect(result.current.transcript).toBe('');

      // Final chunk
      act(() => {
        mockInstance.onresult?.({
          resultIndex: 0,
          results: [Object.assign([{ transcript: 'Berapa turunan x^2?' }], { isFinal: true })],
        });
      });

      expect(result.current.transcript).toBe('Berapa turunan x^2?');
      expect(result.current.interimTranscript).toBe('');
    });

    it('resets transcript cleanly when resetTranscript is called', async () => {
      const { result } = renderHook(() => useSpeechRecognition());

      await act(async () => {
        await result.current.startListening('id-ID');
      });

      act(() => {
        mockInstance.onresult?.({
          resultIndex: 0,
          results: [Object.assign([{ transcript: 'Halo Dunia' }], { isFinal: true })],
        });
      });

      expect(result.current.transcript).toBe('Halo Dunia');

      act(() => {
        result.current.resetTranscript();
      });

      expect(result.current.transcript).toBe('');
    });

    it('stops listening when stopListening is invoked', async () => {
      const { result } = renderHook(() => useSpeechRecognition());

      await act(async () => {
        await result.current.startListening('id-ID');
      });
      expect(result.current.isListening).toBe(true);

      act(() => {
        result.current.stopListening();
      });

      expect(result.current.isListening).toBe(false);
    });
  });
});
