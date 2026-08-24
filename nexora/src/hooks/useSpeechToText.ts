'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

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

function getSpeechRecognition(): (new () => SpeechRecognitionInstance) | undefined {
  if (typeof window === 'undefined') return undefined;
  const win = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  };
  return win.SpeechRecognition || win.webkitSpeechRecognition;
}

/**
 * Sanitizes speech text by collapsing whitespace and removing accidental stutter repetitions.
 */
export function sanitizeSpeechText(text: string): string {
  if (!text) return '';
  // Collapse multiple whitespace into single space
  let cleaned = text.replace(/\s+/g, ' ').trim();
  // Remove consecutive duplicate identical words (case-insensitive) e.g., "rumus rumus" -> "rumus"
  cleaned = cleaned.replace(/\b(\w+)\s+\1\b/gi, '$1');
  return cleaned;
}

/**
 * Merges and deduplicates newly received speech chunk with existing text,
 * preventing duplicate tokens and overlapping boundary phrases.
 */
export function cleanAndDeduplicateSpeech(existingText: string, newChunk: string): string {
  const cleanedExisting = sanitizeSpeechText(existingText);
  const cleanedNew = sanitizeSpeechText(newChunk);

  if (!cleanedExisting) return cleanedNew;
  if (!cleanedNew) return cleanedExisting;

  const existingWords = cleanedExisting.split(' ');
  const newWords = cleanedNew.split(' ');

  // Check for suffix-prefix overlap (up to 4 words)
  const maxOverlap = Math.min(existingWords.length, newWords.length, 4);
  let overlapCount = 0;

  for (let len = maxOverlap; len > 0; len--) {
    const existingSuffix = existingWords.slice(-len).join(' ').toLowerCase();
    const newPrefix = newWords.slice(0, len).join(' ').toLowerCase();
    if (existingSuffix === newPrefix) {
      overlapCount = len;
      break;
    }
  }

  const wordsToAdd = newWords.slice(overlapCount);
  if (wordsToAdd.length === 0) {
    return cleanedExisting;
  }

  return `${cleanedExisting} ${wordsToAdd.join(' ')}`;
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

const MAX_NETWORK_RETRIES = 2;

export function useSpeechToText(defaultOptions: UseSpeechToTextOptions = {}): UseSpeechToTextReturn {
  const [isListening, setIsListening] = useState(false);
  const [isSupported] = useState(() => Boolean(getSpeechRecognition()));
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const optionsRef = useRef(defaultOptions);
  const lastInterimRef = useRef<string>('');
  const retryCountRef = useRef<number>(0);
  const isIntentionalStopRef = useRef<boolean>(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    optionsRef.current = defaultOptions;
  }, [defaultOptions]);

  const commitInterim = useCallback(() => {
    const interimToCommit = sanitizeSpeechText(lastInterimRef.current);
    if (interimToCommit) {
      if (optionsRef.current.onFinalResult) {
        optionsRef.current.onFinalResult(interimToCommit);
      } else if (optionsRef.current.onResult) {
        optionsRef.current.onResult(interimToCommit);
      }
      setTranscript((prev) => cleanAndDeduplicateSpeech(prev, interimToCommit));
      lastInterimRef.current = '';
      setInterimTranscript('');
    }
  }, []);

  const stopListening = useCallback(() => {
    isIntentionalStopRef.current = true;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

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
      const SpeechRecognitionConstructor = getSpeechRecognition();

      if (!SpeechRecognitionConstructor) {
        setError('Speech recognition is not supported in this browser.');
        return;
      }

      isIntentionalStopRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
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
          retryCountRef.current = 0; // Reset network retry count on successful start
        };

        recognition.onresult = (event) => {
          let finalChunk = '';
          let interimChunk = '';

          // Strictly loop from event.resultIndex to avoid duplicating previous results
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const result = event.results[i];
            const text = result[0]?.transcript || '';

            if (result.isFinal) {
              finalChunk += text;
            } else {
              interimChunk += text;
            }
          }

          // Handle finalized speech segment
          if (finalChunk.trim()) {
            const sanitizedFinal = sanitizeSpeechText(finalChunk);
            lastInterimRef.current = '';
            setInterimTranscript('');

            setTranscript((prev) => {
              const updated = cleanAndDeduplicateSpeech(prev, sanitizedFinal);
              return updated;
            });

            if (optionsRef.current.onFinalResult) {
              optionsRef.current.onFinalResult(sanitizedFinal);
            } else if (optionsRef.current.onResult) {
              optionsRef.current.onResult(sanitizedFinal);
            }
          }

          // Handle live interim ghost text (replaces previous interim chunk completely)
          if (interimChunk) {
            const sanitizedInterim = interimChunk.trim();
            lastInterimRef.current = sanitizedInterim;
            setInterimTranscript(sanitizedInterim);
            if (optionsRef.current.onInterimResult) {
              optionsRef.current.onInterimResult(sanitizedInterim);
            }
          } else if (!finalChunk.trim()) {
            lastInterimRef.current = '';
            setInterimTranscript('');
          }
        };

        recognition.onerror = (event) => {
          console.warn('[Speech Recognition Error]:', event.error);

          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            setError('Microphone permission was denied. Please allow microphone access in your browser settings.');
            setIsListening(false);
            setInterimTranscript('');
          } else if (event.error === 'network') {
            // Gracefully attempt automatic silent reconnection on transient network blip
            if (retryCountRef.current < MAX_NETWORK_RETRIES && !isIntentionalStopRef.current) {
              retryCountRef.current += 1;
              console.log(`[Speech Recognition] Transient network blip, retrying (${retryCountRef.current}/${MAX_NETWORK_RETRIES})...`);
              reconnectTimeoutRef.current = setTimeout(() => {
                startListening(options);
              }, 400);
              return;
            }
            // If retry budget exhausted, notify non-destructively
            console.warn('[Speech Recognition] Network reconnect retry budget exceeded.');
            setIsListening(false);
            setInterimTranscript('');
          } else if (event.error === 'no-speech') {
            // Non-fatal silence event, do not crash listening session
          } else if (event.error !== 'aborted') {
            setError(`Speech recognition error: ${event.error}`);
          }

          if (optionsRef.current.onError && event.error !== 'no-speech' && event.error !== 'aborted' && event.error !== 'network') {
            optionsRef.current.onError(event.error);
          }
        };

        recognition.onend = () => {
          // If stopped naturally, commit any remaining interim speech
          commitInterim();

          // Only mark not listening if no pending network reconnection
          if (!reconnectTimeoutRef.current) {
            setIsListening(false);
            setInterimTranscript('');
          }
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
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
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
