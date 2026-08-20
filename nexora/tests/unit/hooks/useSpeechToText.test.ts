import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSpeechToText } from '@/hooks/useSpeechToText';

class MockSpeechRecognition {
  continuous = false;
  interimResults = false;
  lang = 'id-ID';
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((ev: { error: string; message?: string }) => void) | null = null;
  onresult: ((ev: { resultIndex: number; results: Array<Array<{ transcript: string }> & { isFinal?: boolean }> }) => void) | null = null;

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

describe('useSpeechToText Hook', () => {
  let mockInstance: MockSpeechRecognition;

  function MockSpeechRecognitionConstructor(this: unknown) {
    mockInstance = new MockSpeechRecognition();
    return mockInstance;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockInstance = new MockSpeechRecognition();
    // @ts-expect-error - mock constructor type compatibility
    window.SpeechRecognition = MockSpeechRecognitionConstructor;
    // @ts-expect-error - mock constructor type compatibility
    window.webkitSpeechRecognition = MockSpeechRecognitionConstructor;
  });

  afterEach(() => {
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;
  });

  describe('Browser Compatibility', () => {
    it('should indicate unsupported when neither SpeechRecognition nor webkitSpeechRecognition is available', () => {
      // Arrange
      delete window.SpeechRecognition;
      delete window.webkitSpeechRecognition;

      // Act
      const { result } = renderHook(() => useSpeechToText());

      // Assert
      expect(result.current.isSupported).toBe(false);
      expect(result.current.isListening).toBe(false);
    });

    it('should set error state when startListening is called in an unsupported browser', () => {
      // Arrange
      delete window.SpeechRecognition;
      delete window.webkitSpeechRecognition;

      const { result } = renderHook(() => useSpeechToText());

      // Act
      act(() => {
        result.current.startListening();
      });

      // Assert
      expect(result.current.error).toBe('Speech recognition is not supported in this browser.');
      expect(result.current.isListening).toBe(false);
    });

    it('should indicate supported when window.webkitSpeechRecognition is available', () => {
      // Arrange
      delete window.SpeechRecognition;

      // Act
      const { result } = renderHook(() => useSpeechToText());

      // Assert
      expect(result.current.isSupported).toBe(true);
    });
  });

  describe('Speech Recognition Lifecycle & Streaming Events', () => {
    it('should start listening and configure recognition options', () => {
      // Arrange
      const { result } = renderHook(() =>
        useSpeechToText({ lang: 'en-US', continuous: true, interimResults: true })
      );

      // Act
      act(() => {
        result.current.startListening();
      });

      // Assert
      expect(result.current.isListening).toBe(true);
      expect(result.current.error).toBeNull();
      expect(mockInstance.continuous).toBe(true);
      expect(mockInstance.interimResults).toBe(true);
      expect(mockInstance.lang).toBe('en-US');
    });

    it('should stream interim ghost transcripts and invoke onFinalResult for completed chunks', () => {
      // Arrange
      const onFinalMock = vi.fn();
      const onInterimMock = vi.fn();
      const { result } = renderHook(() =>
        useSpeechToText({ onFinalResult: onFinalMock, onInterimResult: onInterimMock })
      );

      act(() => {
        result.current.startListening();
      });

      // Act 1: Dispatch interim transcript
      act(() => {
        const interimEvent = {
          resultIndex: 0,
          results: [
            Object.assign([{ transcript: 'Bagaimana rumus ' }], { isFinal: false }),
          ],
        };
        mockInstance.onresult?.(interimEvent);
      });

      // Assert interim state
      expect(result.current.interimTranscript).toBe('Bagaimana rumus ');
      expect(result.current.transcript).toBe('');
      expect(onInterimMock).toHaveBeenCalledWith('Bagaimana rumus ');

      // Act 2: Dispatch final transcript
      act(() => {
        const finalEvent = {
          resultIndex: 0,
          results: [
            Object.assign([{ transcript: 'Bagaimana rumus energi kinetik?' }], { isFinal: true }),
          ],
        };
        mockInstance.onresult?.(finalEvent);
      });

      // Assert final state and callback
      expect(result.current.transcript).toBe('Bagaimana rumus energi kinetik?');
      expect(result.current.interimTranscript).toBe('');
      expect(onFinalMock).toHaveBeenCalledWith('Bagaimana rumus energi kinetik?');
    });

    it('should stop listening and commit pending interim transcript on stopListening', () => {
      // Arrange
      const onFinalMock = vi.fn();
      const { result } = renderHook(() => useSpeechToText({ onFinalResult: onFinalMock }));

      act(() => {
        result.current.startListening();
      });
      expect(result.current.isListening).toBe(true);

      // Dispatch interim chunk
      act(() => {
        mockInstance.onresult?.({
          resultIndex: 0,
          results: [Object.assign([{ transcript: 'Uncommitted speech' }], { isFinal: false })],
        });
      });
      expect(result.current.interimTranscript).toBe('Uncommitted speech');

      // Act
      act(() => {
        result.current.stopListening();
      });

      // Assert: Flushes and commits pending interim before stopping
      expect(onFinalMock).toHaveBeenCalledWith('Uncommitted speech');
      expect(mockInstance.stop).toHaveBeenCalled();
      expect(result.current.isListening).toBe(false);
      expect(result.current.interimTranscript).toBe('');
    });

    it('should reset transcript when resetTranscript is invoked', () => {
      // Arrange
      const { result } = renderHook(() => useSpeechToText());

      act(() => {
        result.current.startListening();
      });

      act(() => {
        mockInstance.onresult?.({
          resultIndex: 0,
          results: [Object.assign([{ transcript: 'Halo Dunia' }], { isFinal: true })],
        });
      });

      expect(result.current.transcript).toBe('Halo Dunia');

      // Act
      act(() => {
        result.current.resetTranscript();
      });

      // Assert
      expect(result.current.transcript).toBe('');
      expect(result.current.interimTranscript).toBe('');
    });

    it('should handle non-fatal speech errors (no-speech) without setting fatal error state', () => {
      // Arrange
      const { result } = renderHook(() => useSpeechToText());

      act(() => {
        result.current.startListening();
      });

      // Act
      act(() => {
        mockInstance.onerror?.({ error: 'no-speech' });
      });

      // Assert: Remains listening, error remains null
      expect(result.current.isListening).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should handle microphone permission denial error with helpful user message', () => {
      // Arrange
      const { result } = renderHook(() => useSpeechToText());

      act(() => {
        result.current.startListening();
      });

      // Act
      act(() => {
        mockInstance.onerror?.({ error: 'not-allowed', message: 'Microphone permission denied' });
      });

      // Assert
      expect(result.current.isListening).toBe(false);
      expect(result.current.error).toBe(
        'Microphone permission was denied. Please allow microphone access in your browser settings.'
      );
    });

    it('should abort running recognition on unmount', () => {
      // Arrange
      const { result, unmount } = renderHook(() => useSpeechToText());

      act(() => {
        result.current.startListening();
      });

      // Act
      unmount();

      // Assert
      expect(mockInstance.abort).toHaveBeenCalled();
    });
  });
});
