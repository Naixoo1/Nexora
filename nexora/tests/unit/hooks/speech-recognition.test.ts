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
  });

  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).SpeechRecognition;
    delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
  });

  describe('Microphone Permission & Browser Compatibility', () => {
    it('starts recognition smoothly and sets status to listening', async () => {
      const { result } = renderHook(() => useSpeechRecognition());
      expect(result.current.isSupported).toBe(true);
      expect(result.current.recognitionStatus).toBe('idle');

      await act(async () => {
        await result.current.startListening('id-ID');
      });

      expect(mockInstance.start).toHaveBeenCalled();
      expect(result.current.isListening).toBe(true);
      expect(result.current.recognitionStatus).toBe('listening');
      expect(result.current.isPermissionDenied).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('handles fatal not-allowed error by setting isPermissionDenied and halting restart', async () => {
      const { result } = renderHook(() => useSpeechRecognition());

      await act(async () => {
        await result.current.startListening('id-ID');
      });

      act(() => {
        mockInstance.onerror?.({ error: 'not-allowed' });
        mockInstance.onend?.();
      });

      expect(result.current.isListening).toBe(false);
      expect(result.current.isPermissionDenied).toBe(true);
      expect(result.current.recognitionStatus).toBe('error');
      expect(result.current.error).toContain('Microphone access denied');
    });

    it('handles audio-capture busy error without infinite restart loop', async () => {
      const { result } = renderHook(() => useSpeechRecognition());

      await act(async () => {
        await result.current.startListening('id-ID');
      });

      act(() => {
        mockInstance.onerror?.({ error: 'audio-capture' });
        mockInstance.onend?.();
      });

      expect(result.current.isListening).toBe(false);
      expect(result.current.recognitionStatus).toBe('error');
      expect(result.current.error).toContain('No microphone found or audio input device is busy');
    });
  });

  describe('Streaming Speech & Mobile Auto-Restart Throttling', () => {
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

    it('stops listening cleanly and sets status to stopped when stopListening is invoked', async () => {
      const { result } = renderHook(() => useSpeechRecognition());

      await act(async () => {
        await result.current.startListening('id-ID');
      });
      expect(result.current.isListening).toBe(true);

      act(() => {
        result.current.stopListening();
      });

      expect(result.current.isListening).toBe(false);
      expect(result.current.recognitionStatus).toBe('stopped');
    });
  });
});
