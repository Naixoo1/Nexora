'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// Local Web Speech API instance interface
interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: {
    resultIndex: number;
    results: {
      [index: number]: {
        isFinal: boolean;
        [index: number]: { transcript: string; confidence: number };
      };
      length: number;
    };
  }) => void) | null;
}

function getSpeechRecognitionConstructor(): (new () => SpeechRecognitionInstance) | undefined {
  if (typeof window === 'undefined') return undefined;
  const win = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  };
  return win.SpeechRecognition || win.webkitSpeechRecognition;
}

export interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  isSupported: boolean;
  error: string | null;
  startListening: (lang?: string) => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    setIsSupported(Boolean(getSpeechRecognitionConstructor()));
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn('[useSpeechRecognition] Error stopping speech recognition:', err);
      }
    }
    setIsListening(false);
  }, [isListening]);

  const startListening = useCallback(
    (lang = 'id-ID') => {
      setError(null);

      const SpeechRecognitionConstructor = getSpeechRecognitionConstructor();

      if (!SpeechRecognitionConstructor) {
        setError('Browser does not support Web Speech API.');
        return;
      }

      // Stop previous instance if any
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }

      try {
        const recognition = new SpeechRecognitionConstructor();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = lang;

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event) => {
          let currentFinal = '';
          let currentInterim = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const transcriptChunk = result[0]?.transcript || '';

            if (result.isFinal) {
              currentFinal += transcriptChunk + ' ';
            } else {
              currentInterim += transcriptChunk;
            }
          }

          if (currentFinal) {
            setTranscript((prev) => (prev ? `${prev} ${currentFinal}` : currentFinal).trim());
          }
          setInterimTranscript(currentInterim);
        };

        recognition.onerror = (event) => {
          console.warn('[useSpeechRecognition] Error event:', event.error);
          if (event.error === 'not-allowed') {
            setError('Microphone access denied. Please grant microphone permission.');
          } else if (event.error === 'no-speech') {
            // benign
          } else {
            setError(`Speech recognition error: ${event.error}`);
          }
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
          setInterimTranscript('');
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        console.error('[useSpeechRecognition] Failed to start:', err);
        setError(err instanceof Error ? err.message : 'Failed to start speech recognition');
        setIsListening(false);
      }
    },
    []
  );

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
    transcript,
    interimTranscript,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}
