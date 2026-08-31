'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// Local Web Speech API instance interface
interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives?: number;
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
        length?: number;
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

export const normalizeSpeechLang = (rawLang?: string): string => {
  if (!rawLang) return 'id-ID';
  const trimmed = rawLang.trim();
  if (trimmed === 'en') return 'en-US';
  if (trimmed === 'id') return 'id-ID';
  if (trimmed === 'su') return 'id-ID'; // Web Speech API fallback for Sundanese
  return trimmed;
};

export type RecognitionStatus = 'idle' | 'initializing' | 'listening' | 'error' | 'stopped';

export interface UseSpeechRecognitionOptions {
  language?: string; // e.g. 'id-ID' | 'en-US' | 'en-GB'
}

export interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  isSupported: boolean;
  isPermissionDenied: boolean;
  recognitionStatus: RecognitionStatus;
  language: string;
  error: string | null;
  startListening: (lang?: string) => Promise<void>;
  stopListening: () => void;
  resetTranscript: () => void;
  setLanguage: (lang: string) => void;
}

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}): UseSpeechRecognitionReturn {
  const initialLang = normalizeSpeechLang(options.language);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isPermissionDenied, setIsPermissionDenied] = useState<boolean>(false);
  const [recognitionStatus, setRecognitionStatus] = useState<RecognitionStatus>('idle');
  const [language, setLanguageState] = useState<string>(initialLang);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalTranscriptRef = useRef<string>('');
  const interimTranscriptRef = useRef<string>('');
  const shouldKeepListeningRef = useRef<boolean>(false);
  const activeLangRef = useRef<string>(initialLang);
  const consecutiveFailuresRef = useRef<number>(0);
  const lastStartTimeRef = useRef<number>(0);
  const isFatalErrorRef = useRef<boolean>(false);
  const restartTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsSupported(Boolean(getSpeechRecognitionConstructor()));
  }, []);

  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = '';
    interimTranscriptRef.current = '';
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  const stopListening = useCallback(() => {
    shouldKeepListeningRef.current = false;
    isFatalErrorRef.current = false;
    consecutiveFailuresRef.current = 0;

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn('[useSpeechRecognition] Error stopping recognition:', err);
      }
    }
    setIsListening(false);
    setRecognitionStatus('stopped');
    setInterimTranscript('');
  }, []);

  const initAndStartInstance = useCallback((lang: string) => {
    const SpeechRecognitionConstructor = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionConstructor) {
      setError('Browser does not support Web Speech API.');
      setRecognitionStatus('error');
      setIsListening(false);
      shouldKeepListeningRef.current = false;
      return;
    }

    // Abort previous instance safely
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    try {
      const recognition = new SpeechRecognitionConstructor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 3;
      recognition.lang = lang;

      recognition.onstart = () => {
        setIsListening(true);
        setRecognitionStatus('listening');
        lastStartTimeRef.current = Date.now();
        isFatalErrorRef.current = false;
        setError(null);
      };

      recognition.onresult = (event) => {
        // Successful speech received: reset failure throttling counters
        consecutiveFailuresRef.current = 0;

        let sessionNewFinal = '';
        let currentInterim = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (!result) continue;

          // Select the best alternative by confidence
          let bestTranscript = result[0]?.transcript || '';
          let bestConfidence = result[0]?.confidence ?? 0;

          const numAlternatives = typeof result.length === 'number' ? result.length : 1;
          for (let a = 1; a < numAlternatives; a++) {
            const alt = result[a];
            if (alt && typeof alt.confidence === 'number' && alt.confidence > bestConfidence && alt.transcript?.trim()) {
              bestTranscript = alt.transcript;
              bestConfidence = alt.confidence;
            }
          }

          if (result.isFinal) {
            if (bestTranscript.trim()) {
              sessionNewFinal += bestTranscript.trim() + ' ';
            }
          } else {
            currentInterim += bestTranscript;
          }
        }

        if (sessionNewFinal.trim()) {
          finalTranscriptRef.current = (
            finalTranscriptRef.current
              ? `${finalTranscriptRef.current} ${sessionNewFinal.trim()}`
              : sessionNewFinal.trim()
          ).trim();
          setTranscript(finalTranscriptRef.current);
        }
        interimTranscriptRef.current = currentInterim;
        setInterimTranscript(currentInterim);
      };

      recognition.onerror = (event) => {
        console.warn('[useSpeechRecognition] Error event:', event.error);
        const fatalErrors = ['not-allowed', 'service-not-allowed', 'audio-capture'];

        if (fatalErrors.includes(event.error)) {
          isFatalErrorRef.current = true;
          shouldKeepListeningRef.current = false;
          setIsListening(false);
          setRecognitionStatus('error');

          if (event.error === 'not-allowed') {
            setIsPermissionDenied(true);
            setError('Microphone access denied. Please grant microphone permission.');
          } else if (event.error === 'audio-capture') {
            setError('No microphone found or audio input device is busy.');
          } else {
            setError(`Speech service error: ${event.error}`);
          }
        } else if (event.error === 'no-speech') {
          // Benign silence timeout event: do not treat as fatal error
        } else {
          // Non-fatal warning (e.g. network glitch on mobile)
          setError(`Speech recognition notice: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');

        // If fatal error occurred or user stopped explicitly, do not restart
        if (isFatalErrorRef.current || !shouldKeepListeningRef.current) {
          setRecognitionStatus(isFatalErrorRef.current ? 'error' : 'stopped');
          return;
        }

        const sessionDuration = Date.now() - lastStartTimeRef.current;

        // If session ran healthy for > 1500ms before pausing naturally
        if (sessionDuration >= 1500) {
          consecutiveFailuresRef.current = 0;
          restartTimerRef.current = setTimeout(() => {
            if (shouldKeepListeningRef.current && !isFatalErrorRef.current) {
              initAndStartInstance(activeLangRef.current);
            }
          }, 350);
          return;
        }

        // If onend fired rapidly (< 1500ms), throttle with exponential backoff to eliminate flickering
        consecutiveFailuresRef.current += 1;

        if (consecutiveFailuresRef.current >= 3) {
          console.warn('[useSpeechRecognition] Exceeded max fast-restart limit. Halting auto-restart loop.');
          shouldKeepListeningRef.current = false;
          setRecognitionStatus('error');
          setError('Speech recognition paused. Tap to speak.');
          return;
        }

        const delay = Math.min(1000 * Math.pow(1.5, consecutiveFailuresRef.current), 3000);
        restartTimerRef.current = setTimeout(() => {
          if (shouldKeepListeningRef.current && !isFatalErrorRef.current) {
            initAndStartInstance(activeLangRef.current);
          }
        }, delay);
      };

      recognitionRef.current = recognition;
      setRecognitionStatus('initializing');
      recognition.start();
    } catch (err) {
      console.error('[useSpeechRecognition] Failed to start:', err);
      setError(err instanceof Error ? err.message : 'Failed to start speech recognition');
      setIsListening(false);
      setRecognitionStatus('error');
      shouldKeepListeningRef.current = false;
    }
  }, []);

  const setLanguage = useCallback((newLang: string) => {
    const normalized = normalizeSpeechLang(newLang);
    activeLangRef.current = normalized;
    setLanguageState(normalized);
    if (shouldKeepListeningRef.current) {
      initAndStartInstance(normalized);
    }
  }, [initAndStartInstance]);

  const startListening = useCallback(
    async (lang?: string) => {
      const selectedLang = normalizeSpeechLang(lang || activeLangRef.current || 'id-ID');
      setError(null);
      setIsPermissionDenied(false);
      isFatalErrorRef.current = false;
      consecutiveFailuresRef.current = 0;
      activeLangRef.current = selectedLang;
      setLanguageState(selectedLang);
      shouldKeepListeningRef.current = true;

      // Pre-warm and check audio constraints to reduce acoustic distortion and noise
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
          // Immediately release tracks so Web Speech API engine has exclusive unblocked microphone access
          stream.getTracks().forEach((track) => track.stop());
        } catch (micErr) {
          if (
            micErr instanceof Error &&
            (micErr.name === 'NotAllowedError' || micErr.name === 'PermissionDeniedError')
          ) {
            setIsPermissionDenied(true);
            setError('Microphone access is blocked in browser settings. Please allow microphone access.');
            setRecognitionStatus('error');
            shouldKeepListeningRef.current = false;
            return;
          }
        }
      }

      // Check permission state via Permissions API if available (non-blocking, no audio stream lock)
      if (typeof navigator !== 'undefined' && 'permissions' in navigator && navigator.permissions?.query) {
        try {
          const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          if (status.state === 'denied') {
            setIsPermissionDenied(true);
            setError('Microphone access is blocked in browser settings. Please allow microphone access.');
            setRecognitionStatus('error');
            shouldKeepListeningRef.current = false;
            return;
          }
        } catch {
          // Permissions API for microphone is not supported in some browsers, proceed to start natively
        }
      }

      initAndStartInstance(selectedLang);
    },
    [initAndStartInstance]
  );

  useEffect(() => {
    return () => {
      shouldKeepListeningRef.current = false;
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
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
    transcript,
    interimTranscript,
    isSupported,
    isPermissionDenied,
    recognitionStatus,
    language,
    error,
    startListening,
    stopListening,
    resetTranscript,
    setLanguage,
  };
}
