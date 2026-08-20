'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// Web Speech API Types
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((this: ISpeechRecognition, ev: Event) => void) | null;
  onend: ((this: ISpeechRecognition, ev: Event) => void) | null;
  onerror: ((this: ISpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((this: ISpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => ISpeechRecognition;
    webkitSpeechRecognition?: new () => ISpeechRecognition;
  }
}

export interface UseSpeechToTextOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (text: string) => void;
  onFinalResult?: (finalChunk: string) => void;
  onInterimResult?: (interimChunk: string) => void;
  onError?: (error: string) => void;
}

export interface UseSpeechToTextReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  startListening: (options?: UseSpeechToTextOptions) => void;
  stopListening: () => void;
  resetTranscript: () => void;
  commitInterim: () => void;
}

export function useSpeechToText(defaultOptions: UseSpeechToTextOptions = {}): UseSpeechToTextReturn {
  const [isListening, setIsListening] = useState(false);
  const [isSupported] = useState(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionConstructor =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      return Boolean(SpeechRecognitionConstructor);
    }
    return false;
  });
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const optionsRef = useRef(defaultOptions);
  const lastInterimRef = useRef<string>('');

  useEffect(() => {
    optionsRef.current = defaultOptions;
  }, [defaultOptions]);

  const commitInterim = useCallback(() => {
    const interimToCommit = lastInterimRef.current.trim();
    if (interimToCommit) {
      if (optionsRef.current.onFinalResult) {
        optionsRef.current.onFinalResult(interimToCommit);
      } else if (optionsRef.current.onResult) {
        optionsRef.current.onResult(interimToCommit);
      }
      setTranscript((prev) => (prev ? `${prev} ${interimToCommit}` : interimToCommit));
      lastInterimRef.current = '';
      setInterimTranscript('');
    }
  }, []);

  const stopListening = useCallback(() => {
    // Flush any pending interim speech before stopping
    commitInterim();

    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn('[Speech Recognition] Error stopping recognition:', err);
      }
      setIsListening(false);
      setInterimTranscript('');
    }
  }, [isListening, commitInterim]);

  const startListening = useCallback(
    (options?: UseSpeechToTextOptions) => {
      if (typeof window === 'undefined') return;

      const SpeechRecognitionConstructor =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechRecognitionConstructor) {
        setError('Speech recognition is not supported in this browser.');
        return;
      }

      // Stop previous instance if active
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }

      setError(null);
      lastInterimRef.current = '';
      setInterimTranscript('');

      try {
        const recognition = new SpeechRecognitionConstructor();
        recognition.continuous = options?.continuous ?? optionsRef.current.continuous ?? true;
        recognition.interimResults = options?.interimResults ?? optionsRef.current.interimResults ?? true;
        // Default to Indonesian (id-ID), fallback compatible with English (en-US)
        recognition.lang = options?.lang ?? optionsRef.current.lang ?? 'id-ID';

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let currentInterim = '';
          let finalChunk = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const text = result[0].transcript;

            if (result.isFinal) {
              finalChunk += text;
            } else {
              currentInterim += text;
            }
          }

          if (finalChunk) {
            const trimmedFinal = finalChunk.trim();
            lastInterimRef.current = '';
            setInterimTranscript('');

            setTranscript((prev) => {
              const updated = prev ? `${prev} ${trimmedFinal}` : trimmedFinal;
              return updated;
            });

            if (optionsRef.current.onFinalResult) {
              optionsRef.current.onFinalResult(trimmedFinal);
            } else if (optionsRef.current.onResult) {
              optionsRef.current.onResult(trimmedFinal);
            }
          }

          if (currentInterim) {
            lastInterimRef.current = currentInterim;
            setInterimTranscript(currentInterim);
            if (optionsRef.current.onInterimResult) {
              optionsRef.current.onInterimResult(currentInterim);
            }
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.warn('[Speech Recognition Error]:', event.error);

          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            setError('Microphone permission was denied. Please allow microphone access in your browser settings.');
            setIsListening(false);
            setInterimTranscript('');
          } else if (event.error === 'network') {
            setError('Speech recognition network error. Please check your internet connection.');
          } else if (event.error === 'no-speech') {
            // Non-fatal silence event, do not crash listening session
          } else if (event.error !== 'aborted') {
            setError(`Speech recognition error: ${event.error}`);
          }

          if (optionsRef.current.onError && event.error !== 'no-speech' && event.error !== 'aborted') {
            optionsRef.current.onError(event.error);
          }
        };

        recognition.onend = () => {
          // Commit any uncommitted speech before closing
          commitInterim();
          setIsListening(false);
          setInterimTranscript('');
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        console.error('[Speech Recognition]: Failed to initialize:', err);
        setError(err instanceof Error ? err.message : 'Failed to start speech recognition');
        setIsListening(false);
      }
    },
    [commitInterim]
  );

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    lastInterimRef.current = '';
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
    commitInterim,
  };
}
