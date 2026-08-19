import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSpeechToText } from '@/hooks/useSpeechToText';

describe('useSpeechToText', () => {
  let mockRecognitionInstance: any;

  beforeEach(() => {
    mockRecognitionInstance = {
      continuous: false,
      interimResults: false,
      lang: 'id-ID',
      start: vi.fn(),
      stop: vi.fn(),
      abort: vi.fn(),
      onstart: null,
      onend: null,
      onerror: null,
      onresult: null,
    };

    function MockSpeechRecognition(this: any) {
      return mockRecognitionInstance;
    }

    (window as any).SpeechRecognition = MockSpeechRecognition;
    (window as any).webkitSpeechRecognition = MockSpeechRecognition;
  });

  afterEach(() => {
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;
    vi.restoreAllMocks();
  });

  it('detects browser support correctly', () => {
    const { result } = renderHook(() => useSpeechToText());
    expect(result.current.isSupported).toBe(true);
    expect(result.current.isListening).toBe(false);
  });

  it('handles startListening and triggers speech recognition start', () => {
    const { result } = renderHook(() => useSpeechToText());

    act(() => {
      result.current.startListening();
    });

    expect(mockRecognitionInstance.start).toHaveBeenCalled();

    // Trigger onstart callback
    act(() => {
      mockRecognitionInstance.onstart?.();
    });

    expect(result.current.isListening).toBe(true);
  });

  it('processes speech recognition results and updates transcript', () => {
    const onResultMock = vi.fn();
    const { result } = renderHook(() => useSpeechToText({ onResult: onResultMock }));

    act(() => {
      result.current.startListening();
    });

    // Simulate recognition result event
    const mockEvent = {
      resultIndex: 0,
      results: [
        Object.assign([{ transcript: 'Berapa turunan dari sin x' }], { isFinal: true }),
      ],
    };

    act(() => {
      mockRecognitionInstance.onresult?.(mockEvent);
    });

    expect(result.current.transcript).toBe('Berapa turunan dari sin x');
    expect(onResultMock).toHaveBeenCalledWith('Berapa turunan dari sin x');
  });

  it('handles stopListening and resets listening state', () => {
    const { result } = renderHook(() => useSpeechToText());

    act(() => {
      result.current.startListening();
    });

    act(() => {
      mockRecognitionInstance.onstart?.();
    });
    expect(result.current.isListening).toBe(true);

    act(() => {
      result.current.stopListening();
    });

    expect(mockRecognitionInstance.stop).toHaveBeenCalled();
    expect(result.current.isListening).toBe(false);
  });

  it('resets transcript with resetTranscript', () => {
    const { result } = renderHook(() => useSpeechToText());

    const mockEvent = {
      resultIndex: 0,
      results: [
        Object.assign([{ transcript: 'Test speech' }], { isFinal: true }),
      ],
    };

    act(() => {
      result.current.startListening();
      mockRecognitionInstance.onresult?.(mockEvent);
    });

    expect(result.current.transcript).toBe('Test speech');

    act(() => {
      result.current.resetTranscript();
    });

    expect(result.current.transcript).toBe('');
  });
});
