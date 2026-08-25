'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  PhoneOff,
  Mic,
  MicOff,
  Sparkles,
  Volume2,
  VolumeX,
  FastForward,
  Loader2,
  Languages,
  X,
} from 'lucide-react';
import { useCallModeStore, type CallStatus } from '@/stores/useCallModeStore';
import { useLanguageStore } from '@/stores/useLanguageStore';
import { useChatStore } from '@/stores/useChatStore';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { sanitizeReasoningContent } from '@/services/reasoning-sanitizer';
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
    isSupported: isSpeechRecSupported,
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
      if (!useCallModeStore.getState().isMuted) {
        startListening(speechRecognitionLang);
      }
    }
  }, [setCallStatus, resetTranscript, startListening, speechRecognitionLang]);

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

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update transcript into store when speech recognition captures text
  useEffect(() => {
    if (transcript && callStatus === 'LISTENING') {
      setUserTranscript(transcript);

      // Reset debounce timer on new speech
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      // If user pauses for 1.8 seconds, automatically process voice input
      silenceTimerRef.current = setTimeout(() => {
        if (transcript.trim().length > 2 && !isQueryingRef.current) {
          sendVoiceQuery(transcript.trim());
        }
      }, 1800);
    }
  }, [transcript, callStatus, setUserTranscript]);

  // Handle call start / stop lifecycle
  useEffect(() => {
    if (isCallOpen) {
      setCallStatus('LISTENING');
      resetTranscript();
      startListening(speechRecognitionLang);
    } else {
      stopListening();
      stopSpeaking();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    }
  }, [isCallOpen, setCallStatus, resetTranscript, startListening, stopListening, stopSpeaking, speechRecognitionLang]);

  // Query Nexora AI with voice transcript
  const sendVoiceQuery = async (queryText: string) => {
    if (!queryText.trim() || isQueryingRef.current) return;

    isQueryingRef.current = true;
    stopListening();
    setCallStatus('PROCESSING');
    addMessageToHistory('user', queryText);
    setUserTranscript(queryText);
    setAiResponseText('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: queryText,
            },
          ],
          tutorMode: activeTutorMode || 'socratic',
          gradeLevel: gradeLevel || 'SENIOR_HIGH',
          customApiKey: customApiKey || undefined,
          locale: locale || 'id',
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to query Nexora AI');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullResponse += decoder.decode(value, { stream: true });
        setAiResponseText(sanitizeReasoningContent(fullResponse));
      }

      const cleaned = sanitizeReasoningContent(fullResponse);
      addMessageToHistory('assistant', cleaned);
      setCallStatus('SPEAKING');

      // Read response aloud
      speak(cleaned, locale);
    } catch (err) {
      console.error('AI Call error:', err);
      const fallbackText =
        locale === 'en'
          ? 'I could not connect to the reasoning server. Please try speaking again.'
          : locale === 'su'
          ? 'Hapunten, aya gangguan dina sambungan AI. Mangga carioskeun deui.'
          : 'Maaf, terjadi gangguan koneksi ke server AI. Silakan coba bicara kembali.';
      setAiResponseText(fallbackText);
      setCallStatus('SPEAKING');
      speak(fallbackText, locale);
    } finally {
      isQueryingRef.current = false;
    }
  };

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
            <p className="text-xs text-slate-400 font-sans">
              {locale === 'en'
                ? 'Socratic & STEM Interactive Voice Call'
                : locale === 'su'
                ? 'Panggero Sora Interaktif Socratic & STEM'
                : 'Panggilan Suara Interaktif Socratic & STEM'}
            </p>
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

      {/* Center Interactive Animated Voice Orb */}
      <div className="z-10 flex flex-1 flex-col items-center justify-center my-8 text-center max-w-lg w-full">
        {/* Animated Sound Wave / Pulse Orb */}
        <div className="relative flex items-center justify-center">
          {/* Ripple rings */}
          {callStatus === 'LISTENING' && !isMuted && (
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
            className={cn(
              'flex h-40 w-40 items-center justify-center rounded-full shadow-2xl transition-all duration-500',
              callStatus === 'LISTENING' &&
                'bg-gradient-to-tr from-cyan-600 via-sky-500 to-indigo-500 shadow-[0_0_50px_rgba(6,182,212,0.5)] scale-105',
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
            ) : (
              <Mic className="h-14 w-14 text-white animate-pulse" />
            )}
          </div>
        </div>

        {/* State Label */}
        <div className="mt-8">
          <span
            className={cn(
              'rounded-full px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest border transition-colors',
              callStatus === 'LISTENING' &&
                'border-cyan-500/40 bg-cyan-500/15 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]',
              callStatus === 'PROCESSING' &&
                'border-indigo-500/40 bg-indigo-500/15 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]',
              callStatus === 'SPEAKING' &&
                'border-emerald-500/40 bg-emerald-500/15 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]',
              callStatus === 'IDLE' && 'border-white/10 bg-white/5 text-slate-400'
            )}
          >
            {callStatus === 'LISTENING'
              ? locale === 'en'
                ? 'Listening... Speak Now'
                : locale === 'su'
                ? 'Nuju Ngadangukeun... Mangga Carioskeun'
                : 'Mendengarkan... Silakan Bicara'
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

        {/* Realtime Live Transcript Box */}
        <div className="mt-6 w-full rounded-2xl border border-white/10 bg-[#131926]/90 p-4 text-left shadow-xl min-h-[90px] max-h-[140px] overflow-y-auto">
          {callStatus === 'SPEAKING' && aiResponseText ? (
            <p className="text-xs sm:text-sm text-emerald-300 leading-relaxed font-sans line-clamp-4">
              <strong className="text-white block text-[10px] uppercase font-mono mb-1">
                Nexora AI:
              </strong>
              {aiResponseText}
            </p>
          ) : userTranscript ? (
            <p className="text-xs sm:text-sm text-cyan-200 leading-relaxed font-sans">
              <strong className="text-slate-400 block text-[10px] uppercase font-mono mb-1">
                You:
              </strong>
              {userTranscript}
            </p>
          ) : (
            <p className="text-xs text-slate-500 italic text-center pt-3">
              {locale === 'en'
                ? 'Say any math problem, concept, or question naturally...'
                : locale === 'su'
                ? 'Carioskeun perkawis rumus, soal matematika, atanapi konsép naon waé...'
                : 'Ucapkan soal matematika, konsep, atau pertanyaan belajar apa pun...'}
            </p>
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
