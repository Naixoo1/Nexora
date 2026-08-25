'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  PhoneOff,
  Mic,
  MicOff,
  Sparkles,
  Volume2,
  FastForward,
  Loader2,
  X,
  AlertCircle,
  RotateCcw,
  Send,
  Radio,
} from 'lucide-react';
import { useCallModeStore, type CallStatus } from '@/stores/useCallModeStore';
import { useLanguageStore } from '@/stores/useLanguageStore';
import { useChatStore } from '@/stores/useChatStore';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { sanitizeReasoningContent } from '@/services/reasoning-sanitizer';
import { formatMathForVoice } from '@/utils/latex-formatter';
import { MarkdownRenderer } from './MarkdownRenderer';
import { cn } from '@/lib/utils';

export const AICallModal: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const {
    isCallOpen,
    callStatus,
    isMuted,
    userTranscript,
    aiResponseText,
    endCall,
    setCallStatus,
    toggleMute,
    setUserTranscript,
    setAiResponseText,
    addMessageToHistory,
  } = useCallModeStore();

  const locale = useLanguageStore((state) => state.locale);
  const { activeTutorMode, gradeLevel, customApiKey } = useChatStore();

  // Web Speech API input
  const speechRecognitionLang = locale === 'en' ? 'en-US' : 'id-ID';
  const {
    isListening,
    transcript,
    interimTranscript,
    isSupported: isSpeechRecSupported,
    isPermissionDenied,
    recognitionStatus,
    error: speechRecError,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  // Web Speech Synthesis output
  const handleAiSpeechEnd = useCallback(() => {
    // When AI finishes speaking, transition back to listening if call is still active
    if (useCallModeStore.getState().isCallOpen) {
      setCallStatus('LISTENING');
      resetTranscript();
      setUserTranscript('');
      if (!useCallModeStore.getState().isMuted) {
        startListening(speechRecognitionLang);
      }
    }
  }, [setCallStatus, resetTranscript, setUserTranscript, startListening, speechRecognitionLang]);

  const {
    isPlaying: isAiSpeaking,
    speak,
    stop: stopSpeaking,
  } = useTextToSpeech({
    onEnd: handleAiSpeechEnd,
  });

  // Track silence / commit timer when user stops speaking
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isQueryingRef = useRef<boolean>(false);
  const activePromptRef = useRef<string>('');
  const transcriptContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Compute full current live speech (committed + interim)
  const currentLiveSpeech = (
    transcript ? `${transcript} ${interimTranscript}` : interimTranscript
  ).trim();

  // Auto-scroll transcript container smoothly as speech is streamed
  useEffect(() => {
    if (transcriptContainerRef.current) {
      const scrollTimer = setTimeout(() => {
        if (transcriptContainerRef.current) {
          transcriptContainerRef.current.scrollTo({
            top: transcriptContainerRef.current.scrollHeight,
            behavior: 'smooth',
          });
        }
      }, 50);
      return () => clearTimeout(scrollTimer);
    }
  }, [aiResponseText, currentLiveSpeech, userTranscript, callStatus]);

  // Query Nexora AI with voice transcript
  const sendVoiceQuery = useCallback(
    async (queryText: string) => {
      if (!queryText.trim() || isQueryingRef.current) return;

      isQueryingRef.current = true;
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      stopListening();
      setCallStatus('PROCESSING');
      addMessageToHistory('user', queryText);
      setUserTranscript(queryText);
      setAiResponseText('');

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'x-user-locale': locale || 'id',
          'x-grade-level': gradeLevel || 'SENIOR_HIGH',
        };

        if (customApiKey && customApiKey.trim()) {
          headers['x-gemini-api-key'] = customApiKey.trim();
        }

        const payload = {
          message: queryText,
          mode: activeTutorMode || 'socratic',
          context: {
            tutorMode: activeTutorMode || 'socratic',
            gradeLevel: gradeLevel || 'SENIOR_HIGH',
            locale: locale || 'id',
            isCallMode: true,
          },
        };

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[AICallModal] /api/chat error response:', response.status, errorText);
          let errorMsg = `Server error (${response.status})`;
          try {
            const parsedError = JSON.parse(errorText);
            if (parsedError.error) errorMsg = parsedError.error;
            else if (parsedError.message) errorMsg = parsedError.message;
          } catch {
            if (errorText) errorMsg = errorText;
          }
          throw new Error(errorMsg);
        }

        if (!response.body) {
          throw new Error('Response body is empty');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullResponse += decoder.decode(value, { stream: true });
          const sanitized = sanitizeReasoningContent(fullResponse);
          setAiResponseText(sanitized);
        }

        const cleaned = sanitizeReasoningContent(fullResponse);
        setAiResponseText(cleaned);
        addMessageToHistory('assistant', cleaned);
        setCallStatus('SPEAKING');

        // Read response aloud
        speak(cleaned, locale);
      } catch (err) {
        console.error('[AICallModal] AI Call error:', err);
        const errMessage = err instanceof Error ? err.message : String(err);
        const fallbackText =
          locale === 'en'
            ? `Connection issue (${errMessage}). Tap below to retry.`
            : locale === 'su'
            ? `Aya gangguan sambungan (${errMessage}). Mangga pencet di handap kanggo nyobian deui.`
            : `Terjadi gangguan koneksi (${errMessage}). Silakan tekan tombol untuk bicara kembali.`;
        setAiResponseText(fallbackText);
        setCallStatus('SPEAKING');
        speak(fallbackText, locale);
      } finally {
        isQueryingRef.current = false;
      }
    },
    [
      stopListening,
      setCallStatus,
      addMessageToHistory,
      setUserTranscript,
      setAiResponseText,
      activeTutorMode,
      gradeLevel,
      customApiKey,
      locale,
      speak,
    ]
  );

  // 2. Smart Silence Detection (1.2-second debounce timer)
  useEffect(() => {
    if (callStatus === 'LISTENING' && currentLiveSpeech) {
      setUserTranscript(currentLiveSpeech);
      activePromptRef.current = currentLiveSpeech;

      // Reset timer on any new speech chunk
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      // Check if user has spoken at least 2 words or 4 characters
      const words = currentLiveSpeech.split(/\s+/).filter(Boolean);
      if (words.length >= 2 || currentLiveSpeech.length >= 4) {
        silenceTimerRef.current = setTimeout(() => {
          if (!isQueryingRef.current && activePromptRef.current.trim().length > 0) {
            sendVoiceQuery(activePromptRef.current.trim());
          }
        }, 1200);
      }
    }
  }, [currentLiveSpeech, callStatus, setUserTranscript, sendVoiceQuery]);

  // Handle call start / stop lifecycle
  useEffect(() => {
    if (isCallOpen) {
      setCallStatus('LISTENING');
      resetTranscript();
      setUserTranscript('');
      setAiResponseText('');
      startListening(speechRecognitionLang);
    } else {
      stopListening();
      stopSpeaking();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    }
  }, [
    isCallOpen,
    setCallStatus,
    resetTranscript,
    setUserTranscript,
    setAiResponseText,
    startListening,
    stopListening,
    stopSpeaking,
    speechRecognitionLang,
  ]);

  const handleSkipSpeaking = () => {
    stopSpeaking();
    handleAiSpeechEnd();
  };

  const handleToggleMute = () => {
    if (isMuted) {
      toggleMute();
      if (callStatus === 'LISTENING') {
        startListening(speechRecognitionLang);
      }
    } else {
      toggleMute();
      stopListening();
    }
  };

  const handleEndCall = () => {
    stopListening();
    stopSpeaking();
    endCall();
  };

  const handleManualStartSpeak = () => {
    resetTranscript();
    setUserTranscript('');
    startListening(speechRecognitionLang);
  };

  const handleManualSubmitNow = () => {
    const textToSubmit = currentLiveSpeech || userTranscript;
    if (textToSubmit.trim()) {
      sendVoiceQuery(textToSubmit.trim());
    }
  };

  if (!mounted || !isCallOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-between bg-gradient-to-b from-[#0B0F17]/95 via-[#0F1422]/98 to-[#0B0F17] p-6 backdrop-blur-2xl animate-in fade-in duration-300">
      {/* Background ambient glow */}
      <div
        className={cn(
          'pointer-events-none absolute h-96 w-96 rounded-full blur-[120px] transition-all duration-700 -top-20',
          callStatus === 'LISTENING' && 'bg-cyan-500/20',
          callStatus === 'PROCESSING' && 'bg-indigo-500/20',
          callStatus === 'SPEAKING' && 'bg-emerald-500/20',
          callStatus === 'IDLE' && 'bg-slate-500/10'
        )}
      />

      {/* Top Header Bar */}
      <div className="z-10 flex w-full max-w-2xl items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-400 text-white shadow-lg shadow-cyan-500/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span>Nexora Realtime AI Voice</span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-slate-400 font-sans">
                {locale === 'en'
                  ? 'Socratic & STEM Interactive Voice Call'
                  : locale === 'su'
                  ? 'Panggero Sora Interaktif Socratic & STEM'
                  : 'Panggilan Suara Interaktif Socratic & STEM'}
              </p>
              {/* Live Recognition Status Diagnostic Badge */}
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.2 text-[10px] font-mono border',
                  recognitionStatus === 'listening' &&
                    'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
                  recognitionStatus === 'initializing' &&
                    'border-amber-500/30 bg-amber-500/10 text-amber-300',
                  recognitionStatus === 'error' &&
                    'border-rose-500/30 bg-rose-500/10 text-rose-400',
                  recognitionStatus === 'stopped' &&
                    'border-white/10 bg-white/5 text-slate-400'
                )}
              >
                <Radio className="h-2.5 w-2.5" />
                <span>
                  {recognitionStatus === 'listening'
                    ? locale === 'en'
                      ? 'Live'
                      : 'Aktif'
                    : recognitionStatus === 'initializing'
                    ? locale === 'en'
                      ? 'Connecting'
                      : 'Menyambungkan'
                    : recognitionStatus === 'error'
                    ? locale === 'en'
                      ? 'Manual'
                      : 'Mode Manual'
                    : locale === 'en'
                    ? 'Standby'
                    : 'Siaga'}
                </span>
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleEndCall}
          className="rounded-2xl border border-white/10 bg-white/5 p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          title="Close Call"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Microphone Permission Warning Banner */}
      {(isPermissionDenied || (speechRecError && recognitionStatus === 'error')) && (
        <div className="z-20 mt-3 w-full max-w-lg rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs text-amber-200 backdrop-blur-md shadow-lg flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
            <span>
              {speechRecError ||
                (locale === 'en'
                  ? 'Microphone access is required for AI Call. Please allow microphone permissions.'
                  : locale === 'su'
                  ? 'Aksés mikrofon diperyogikeun kanggo Telepon AI. Mangga widian izin mikrofon dina browser.'
                  : 'Akses mikrofon diperlukan untuk Panggilan AI. Silakan izinkan akses mikrofon di browser.')}
            </span>
          </div>
          <button
            type="button"
            onClick={handleManualStartSpeak}
            className="flex items-center gap-1 rounded-xl bg-amber-500 px-3 py-1.5 font-bold text-slate-950 hover:bg-amber-400 shrink-0 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{locale === 'en' ? 'Retry' : 'Coba Lagi'}</span>
          </button>
        </div>
      )}

      {/* Center Interactive Animated Voice Orb */}
      <div className="z-10 flex flex-1 flex-col items-center justify-center my-6 text-center max-w-lg w-full">
        {/* Animated Sound Wave / Pulse Orb */}
        <div className="relative flex items-center justify-center">
          {/* Ripple rings */}
          {callStatus === 'LISTENING' && !isMuted && isListening && (
            <>
              <div className="absolute h-56 w-56 rounded-full border border-cyan-400/30 animate-ping opacity-50" />
              <div className="absolute h-72 w-72 rounded-full border border-cyan-500/20 animate-pulse opacity-40" />
            </>
          )}

          {callStatus === 'PROCESSING' && (
            <div className="absolute h-60 w-60 rounded-full border-2 border-dashed border-indigo-400/50 animate-spin" />
          )}

          {callStatus === 'SPEAKING' && (
            <>
              <div className="absolute h-56 w-56 rounded-full border border-emerald-400/40 animate-ping opacity-60" />
              <div className="absolute h-72 w-72 rounded-full border border-teal-500/20 animate-pulse" />
            </>
          )}

          {/* Core Orb */}
          <div
            onClick={callStatus === 'LISTENING' && !isListening ? handleManualStartSpeak : undefined}
            className={cn(
              'flex h-40 w-40 items-center justify-center rounded-full shadow-2xl transition-all duration-500 cursor-pointer',
              callStatus === 'LISTENING' && isListening &&
                'bg-gradient-to-tr from-cyan-600 via-sky-500 to-indigo-500 shadow-[0_0_50px_rgba(6,182,212,0.5)] scale-105',
              callStatus === 'LISTENING' && !isListening &&
                'bg-gradient-to-tr from-indigo-700 via-slate-700 to-cyan-800 shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:scale-105',
              callStatus === 'PROCESSING' &&
                'bg-gradient-to-tr from-indigo-600 via-purple-500 to-sky-600 shadow-[0_0_50px_rgba(99,102,241,0.5)] scale-100 animate-pulse',
              callStatus === 'SPEAKING' &&
                'bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-500 shadow-[0_0_60px_rgba(16,185,129,0.5)] scale-110',
              callStatus === 'IDLE' &&
                'bg-gradient-to-tr from-slate-700 to-slate-800 shadow-[0_0_20px_rgba(0,0,0,0.5)] scale-95'
            )}
          >
            {callStatus === 'PROCESSING' ? (
              <Loader2 className="h-14 w-14 animate-spin text-white" />
            ) : callStatus === 'SPEAKING' ? (
              <Volume2 className="h-14 w-14 text-white animate-bounce" />
            ) : isMuted ? (
              <MicOff className="h-14 w-14 text-red-300" />
            ) : isListening ? (
              <Mic className="h-14 w-14 text-white animate-pulse" />
            ) : (
              <Mic className="h-14 w-14 text-cyan-300" />
            )}
          </div>
        </div>

        {/* State Label */}
        <div className="mt-7">
          <span
            className={cn(
              'rounded-full px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest border transition-colors',
              callStatus === 'LISTENING' && isListening &&
                'border-cyan-500/40 bg-cyan-500/15 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]',
              callStatus === 'LISTENING' && !isListening &&
                'border-indigo-500/40 bg-indigo-500/15 text-indigo-300',
              callStatus === 'PROCESSING' &&
                'border-indigo-500/40 bg-indigo-500/15 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]',
              callStatus === 'SPEAKING' &&
                'border-emerald-500/40 bg-emerald-500/15 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]',
              callStatus === 'IDLE' && 'border-white/10 bg-white/5 text-slate-400'
            )}
          >
            {callStatus === 'LISTENING'
              ? isListening
                ? locale === 'en'
                  ? 'Listening... Speak Now'
                  : locale === 'su'
                  ? 'Nuju Ngadangukeun... Mangga Carioskeun'
                  : 'Mendengarkan... Silakan Bicara'
                : locale === 'en'
                ? 'Tap Orb or Button to Speak'
                : locale === 'su'
                ? 'Pencet Orb kanggo Nyarios'
                : 'Tekan Orb untuk Bicara'
              : callStatus === 'PROCESSING'
              ? locale === 'en'
                ? 'Nexora is reasoning...'
                : locale === 'su'
                ? 'Nexora nuju mikir...'
                : 'Nexora sedang berpikir...'
              : callStatus === 'SPEAKING'
              ? locale === 'en'
                ? 'Nexora Speaking'
                : locale === 'su'
                ? 'Nexora Nuju Nyarios'
                : 'Nexora Sedang Menjelaskan'
              : 'Idle'}
          </span>
        </div>

        {/* Realtime Live Transcript Visual Box with Auto-Scroll & Markdown/KaTeX Math Rendering */}
        <div
          ref={transcriptContainerRef}
          className="mt-5 w-full min-w-0 max-w-full rounded-2xl border border-white/10 bg-[#131926]/90 p-4.5 text-left shadow-2xl min-h-[100px] max-h-52 md:max-h-64 overflow-y-auto custom-scrollbar backdrop-blur-md transition-all [overflow-wrap:anywhere] break-words"
        >
          {callStatus === 'SPEAKING' && aiResponseText ? (
            <div className="space-y-1.5 w-full min-w-0">
              <strong className="text-emerald-400 flex items-center gap-1.5 text-[11px] uppercase font-mono tracking-wider">
                <Volume2 className="h-3.5 w-3.5 animate-pulse text-emerald-400 shrink-0" />
                <span>Nexora AI:</span>
              </strong>
              <div className="text-sm md:text-base text-emerald-100/95 leading-relaxed font-sans [overflow-wrap:anywhere] break-words text-pretty selection:bg-emerald-500/30">
                <MarkdownRenderer content={aiResponseText} />
              </div>
            </div>
          ) : currentLiveSpeech ? (
            <div className="space-y-1.5 w-full min-w-0">
              <strong className="text-cyan-400 flex items-center gap-1.5 text-[11px] uppercase font-mono tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping shrink-0" />
                <span>
                  {locale === 'en'
                    ? 'Transcribing Live:'
                    : locale === 'su'
                    ? 'Nuju Dirékam:'
                    : 'Mendengarkan Langsung:'}
                </span>
              </strong>
              <p className="text-sm md:text-base text-cyan-100 leading-relaxed font-sans whitespace-pre-wrap [overflow-wrap:anywhere] break-words break-all text-pretty italic">
                &ldquo;{currentLiveSpeech}&rdquo;
              </p>
            </div>
          ) : userTranscript ? (
            <div className="space-y-1.5 w-full min-w-0">
              <strong className="text-slate-400 block text-[11px] uppercase font-mono tracking-wider">
                You:
              </strong>
              <p className="text-sm md:text-base text-slate-200 leading-relaxed font-sans whitespace-pre-wrap [overflow-wrap:anywhere] break-words break-all text-pretty">
                {userTranscript}
              </p>
            </div>
          ) : (
            <p className="text-xs sm:text-sm text-slate-500 italic text-center pt-4">
              {locale === 'en'
                ? 'Say any math problem, concept, or question naturally...'
                : locale === 'su'
                ? 'Carioskeun perkawis rumus, soal matematika, atanapi konsép naon waé...'
                : 'Ucapkan soal matematika, konsep, atau pertanyaan belajar apa pun...'}
            </p>
          )}
        </div>

        {/* Push-to-Talk / Quick Submit Action Button */}
        <div className="mt-3 flex items-center justify-center gap-2">
          {callStatus === 'LISTENING' && !isListening && (
            <button
              type="button"
              onClick={handleManualStartSpeak}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-2 text-xs font-semibold text-white shadow-lg transition-all hover:opacity-95 active:scale-95"
            >
              <Mic className="h-3.5 w-3.5" />
              <span>{locale === 'en' ? 'Tap to Speak' : locale === 'su' ? 'Pencet kanggo Nyarios' : 'Tekan untuk Bicara'}</span>
            </button>
          )}

          {callStatus === 'LISTENING' && currentLiveSpeech.length > 0 && (
            <button
              type="button"
              onClick={handleManualSubmitNow}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg transition-all hover:bg-emerald-500 active:scale-95 animate-in fade-in"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{locale === 'en' ? 'Send Voice Query' : locale === 'su' ? 'Kintun Pertarosan' : 'Kirim Sekarang'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Bottom Floating Control Buttons */}
      <div className="z-10 flex items-center justify-center gap-4 py-2">
        {/* Mute/Unmute Mic */}
        <button
          type="button"
          onClick={handleToggleMute}
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-2xl border transition-all shadow-lg',
            isMuted
              ? 'border-red-500/50 bg-red-500/20 text-red-300 hover:bg-red-500/30'
              : 'border-white/10 bg-[#131926] text-white hover:bg-white/10'
          )}
          title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        >
          {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </button>

        {/* Skip Speaking (If AI is currently speaking) */}
        {callStatus === 'SPEAKING' && (
          <button
            type="button"
            onClick={handleSkipSpeaking}
            className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-[#131926] text-amber-300 hover:bg-white/10 transition-all shadow-lg"
            title="Skip Speaking"
          >
            <FastForward className="h-6 w-6" />
          </button>
        )}

        {/* End Call Button */}
        <button
          type="button"
          onClick={handleEndCall}
          className="flex h-14 w-20 items-center justify-center rounded-2xl bg-red-600 text-white shadow-xl shadow-red-600/30 hover:bg-red-500 active:scale-95 transition-all"
          title="End Call"
        >
          <PhoneOff className="h-6 w-6" />
        </button>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
