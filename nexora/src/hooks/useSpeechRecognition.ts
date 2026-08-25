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
  isPermissionDenied: boolean;
  error: string | null;
  startListening: (lang?: string) => Promise<void>;
  stopListening: () => void;
  resetTranscript: () => void;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isPermissionDenied, setIsPermissionDenied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const shouldKeepListeningRef = useRef<boolean>(false);
  const activeLangRef = useRef<string>('id-ID');

  useEffect(() => {
    setIsSupported(Boolean(getSpeechRecognitionConstructor()));
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  const stopListening = useCallback(() => {
    shouldKeepListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn('[useSpeechRecognition] Error stopping speech recognition:', err);
      }
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const startListening = useCallback(
    async (lang = 'id-ID') => {
      setError(null);
      setIsPermissionDenied(false);
      activeLangRef.current = lang;
      shouldKeepListeningRef.current = true;

      // 1. Explicitly verify & request microphone access via getUserMedia
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          // Release tracks so SpeechRecognition has unrestricted microphone access
          stream.getTracks().forEach((track) => track.stop());
        } catch (err: unknown) {
          console.warn('[useSpeechRecognition] Microphone permission denied:', err);
          setIsPermissionDenied(true);
          setError('Microphone access is required for AI Call. Please allow microphone permissions in your browser.');
          setIsListening(false);
          shouldKeepListeningRef.current = false;
          return;
        }
      }

      const SpeechRecognitionConstructor = getSpeechRecognitionConstructor();

      if (!SpeechRecognitionConstructor) {
        setError('Browser does not support Web Speech API.');
        setIsListening(false);
        shouldKeepListeningRef.current = false;
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
          setError(null);
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
            setIsPermissionDenied(true);
            setError('Microphone access denied. Please grant microphone permission.');
            shouldKeepListeningRef.current = false;
            setIsListening(false);
          } else if (event.error === 'no-speech') {
            // Benign silence event: keep listening state
          } else if (event.error === 'network') {
            // Mobile network hiccup: allow auto-restart on onend
          } else {
            setError(`Speech recognition error: ${event.error}`);
          }
        };

        recognition.onend = () => {
          setInterimTranscript('');
          if (shouldKeepListeningRef.current) {
            // Mobile browser lifecycle auto-restart (iOS Safari / Chrome Android)
            try {
              setTimeout(() => {
                if (shouldKeepListeningRef.current && recognitionRef.current) {
                  recognitionRef.current.start();
                }
              }, 200);
            } catch {
              setIsListening(false);
            }
          } else {
            setIsListening(false);
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        console.error('[useSpeechRecognition] Failed to start:', err);
        setError(err instanceof Error ? err.message : 'Failed to start speech recognition');
        setIsListening(false);
        shouldKeepListeningRef.current = false;
      }
    },
    []
  );

  useEffect(() => {
    return () => {
      shouldKeepListeningRef.current = false;
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
    isPermissionDenied,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}
