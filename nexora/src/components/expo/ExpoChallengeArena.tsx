'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Sparkles,
  Flame,
  Clock,
  Mic,
  MicOff,
  CheckCircle2,
  XCircle,
  Lightbulb,
  ArrowRight,
  RotateCcw,
  GraduationCap,
  Award,
  Crown,
  ShieldCheck,
  Send,
  Zap,
  Volume2,
  VolumeX,
  BookOpen,
  Network,
  Share2,
} from 'lucide-react';
import { useExpoGameStore } from '@/stores/useExpoGameStore';
import { useTranslation } from '@/hooks/useTranslation';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { MarkdownRenderer } from '@/components/chat/MarkdownRenderer';
import type { ExpoGradeTier } from '@/types/expo';
import { cn } from '@/lib/utils';

export const ExpoChallengeArena: React.FC = () => {
  const { t } = useTranslation();
  const {
    isPlaying: isReadingQuestion,
    speak: speakQuestion,
    stop: stopSpeakingQuestion,
  } = useTextToSpeech();
  const {
    gamePhase,
    selectedGrade,
    questions,
    currentIndex,
    currentQuestion,
    timeRemaining,
    maxTimeForRound,
    score,
    streak,
    hintsRevealed,
    aiClue,
    isFetchingClue,
    selectedOption,
    textAnswerInput,
    lastRoundResult,
    gameSummary,
    selectGradeTier,
    startGame,
    selectOption,
    setTextAnswer,
    submitAnswer,
    nextQuestion,
    revealHint,
    requestAiSocraticClue,
    tickTimer,
    resetGame,
  } = useExpoGameStore();

  const {
    isListening,
    transcript,
    isSupported: isSpeechSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  const [hasCopiedCert, setHasCopiedCert] = useState<boolean>(false);

  // Interval timer for active rounds
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (gamePhase === 'PLAYING') {
      timer = setInterval(() => {
        tickTimer();
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [gamePhase, tickTimer]);

  // Sync speech recognition transcript into answer text
  useEffect(() => {
    if (transcript && isListening) {
      setTextAnswer(transcript);
      // If multiple choice, check if spoken transcript matches any option
      if (currentQuestion?.options) {
        const lowerTrans = transcript.toLowerCase();
        const matched = currentQuestion.options.find((opt) =>
          opt.toLowerCase().includes(lowerTrans) || lowerTrans.includes(opt.toLowerCase())
        );
        if (matched) {
          selectOption(matched);
        }
      }
    }
  }, [transcript, isListening, currentQuestion, selectOption, setTextAnswer]);

  const handleToggleVoice = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening('id-ID');
    }
  };

  const timeRatio = maxTimeForRound > 0 ? timeRemaining / maxTimeForRound : 0;
  const isTimeCritical = timeRemaining <= 15;

  return (
    <div className="min-h-screen bg-[#0B0F17] text-white selection:bg-cyan-500/30 selection:text-white flex flex-col justify-between">
      {/* ── 1. WELCOME & GRADE SELECT PHASE ──────────────────────── */}
      {gamePhase === 'WELCOME' && (
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
          {/* Header Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold text-cyan-300 shadow-sm backdrop-blur-md animate-pulse">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <span>Interactive Expo AI Challenge Arena</span>
          </div>

          <h1 className="mt-4 text-center text-3xl font-extrabold tracking-tight sm:text-5xl bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent">
            Uji Penalaran & Logika Interaktif
          </h1>
          <p className="mt-3 text-center text-sm sm:text-base text-slate-400 max-w-2xl">
            Selesaikan soal cerita kontekstual matematika & wawasan umum. Gunakan suara untuk menjawab dan minta petunjuk berpikir Socratic langsung dari Nexora AI!
          </p>

          {/* Grade Tier Selection Grid */}
          <div className="mt-8 grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
            {/* SD Card */}
            <div
              onClick={() => selectGradeTier('PRIMARY')}
              className={cn(
                'group relative cursor-pointer rounded-3xl border p-5 transition-all duration-200 backdrop-blur-md',
                selectedGrade === 'PRIMARY'
                  ? 'border-cyan-400 bg-cyan-950/30 ring-2 ring-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.2)]'
                  : 'border-white/10 bg-[#131926]/70 hover:border-white/20 hover:bg-[#131926]'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  <BookOpen className="h-5 w-5" />
                </div>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 flex items-center gap-1">
                  <Mic className="h-3 w-3" /> Voice Ready
                </span>
              </div>
              <h3 className="mt-4 text-base font-bold text-white">Sekolah Dasar (SD)</h3>
              <p className="mt-1 text-xs text-slate-400">
                Soal cerita visual, kelipatan, belanja, dan wawasan nusantara.
              </p>
              <div className="mt-4 text-[11px] font-semibold text-cyan-400 flex items-center gap-1">
                <span>Pilih Tingkat SD</span>
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
              </div>
            </div>

            {/* SMP Card */}
            <div
              onClick={() => selectGradeTier('JUNIOR_HIGH')}
              className={cn(
                'group relative cursor-pointer rounded-3xl border p-5 transition-all duration-200 backdrop-blur-md',
                selectedGrade === 'JUNIOR_HIGH'
                  ? 'border-indigo-400 bg-indigo-950/30 ring-2 ring-indigo-400 shadow-[0_0_30px_rgba(99,102,241,0.2)]'
                  : 'border-white/10 bg-[#131926]/70 hover:border-white/20 hover:bg-[#131926]'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <span className="rounded-full border border-indigo-500/30 bg-indigo-500/15 px-2.5 py-0.5 text-[10px] font-bold text-indigo-300">
                  SMP / 7-9
                </span>
              </div>
              <h3 className="mt-4 text-base font-bold text-white">SMP (Junior High)</h3>
              <p className="mt-1 text-xs text-slate-400">
                Skala peta, barisan kursi, Pythagoras, dan peristiwa bersejarah.
              </p>
              <div className="mt-4 text-[11px] font-semibold text-indigo-400 flex items-center gap-1">
                <span>Pilih Tingkat SMP</span>
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
              </div>
            </div>

            {/* SMA Card */}
            <div
              onClick={() => selectGradeTier('SENIOR_HIGH')}
              className={cn(
                'group relative cursor-pointer rounded-3xl border p-5 transition-all duration-200 backdrop-blur-md',
                selectedGrade === 'SENIOR_HIGH'
                  ? 'border-amber-400 bg-amber-950/30 ring-2 ring-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.2)]'
                  : 'border-white/10 bg-[#131926]/70 hover:border-white/20 hover:bg-[#131926]'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <Crown className="h-5 w-5" />
                </div>
                <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold text-amber-300">
                  SMA / HOTS
                </span>
              </div>
              <h3 className="mt-4 text-base font-bold text-white">SMA (Senior High)</h3>
              <p className="mt-1 text-xs text-slate-400">
                Geometri tak hingga, optimasi diferensial, kombinatorika, & moneter.
              </p>
              <div className="mt-4 text-[11px] font-semibold text-amber-400 flex items-center gap-1">
                <span>Pilih Tingkat SMA</span>
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-8 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => startGame(selectedGrade)}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-500 px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-cyan-500/25 transition-all hover:scale-105 active:scale-95"
            >
              <Trophy className="h-5 w-5" />
              <span>{t('expo.start')}</span>
            </button>
            <span className="text-xs text-slate-400">
              5 Soal Cerita Tantangan • Bonus Kecepatan • Socratic AI Assistant
            </span>
          </div>
        </div>
      )}

      {/* ── 2. ACTIVE PLAYING ROUND PHASE ────────────────────────── */}
      {gamePhase === 'PLAYING' && currentQuestion && (
        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-6 sm:px-6">
          {/* Top Game Bar */}
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#131926]/90 p-3.5 backdrop-blur-xl shadow-lg">
            {/* Progress & Tier */}
            <div className="flex items-center gap-3">
              <span className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-bold text-cyan-300">
                Soal {currentIndex + 1} / {questions.length}
              </span>
              <span className="hidden sm:inline-block text-xs font-medium text-slate-400">
                Tingkat: <strong className="text-white">{selectedGrade}</strong>
              </span>
            </div>

            {/* Streak Multiplier */}
            {streak > 0 && (
              <div className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-300 animate-bounce">
                <Flame className="h-4 w-4 text-amber-400" />
                <span>Streak x{streak >= 3 ? '1.5' : streak >= 2 ? '1.25' : '1.0'}</span>
              </div>
            )}

            {/* Score & Live Timer */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">{t('expo.score')}</span>
                <span className="text-sm font-extrabold text-cyan-400 font-mono">{score} pts</span>
              </div>

              <div
                className={cn(
                  'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold font-mono border transition-colors',
                  isTimeCritical
                    ? 'border-red-500 bg-red-500/20 text-red-300 animate-pulse'
                    : 'border-white/10 bg-[#0B0F17] text-white'
                )}
              >
                <Clock className="h-3.5 w-3.5 text-cyan-400" />
                <span>{timeRemaining}s</span>
              </div>
            </div>
          </div>

          {/* Progress Bar Line */}
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-sky-400 to-cyan-400 transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>

          {/* Question Scenario Card */}
          <div className="mt-4 rounded-3xl border border-white/10 bg-[#131926] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                {currentQuestion.category === 'MATH' ? '📐 Tantangan Matematika' : '🌍 Wawasan Umum'}
              </span>
              <span className="text-xs font-semibold text-slate-400">
                Nilai Dasar: <span className="text-white font-mono">{currentQuestion.points} pts</span>
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-white tracking-tight">{currentQuestion.title}</h2>
              <button
                type="button"
                onClick={() => {
                  if (isReadingQuestion) {
                    stopSpeakingQuestion();
                  } else {
                    speakQuestion(`${currentQuestion.title}. ${currentQuestion.storyScenario}`);
                  }
                }}
                className={cn(
                  'flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all shrink-0',
                  isReadingQuestion
                    ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300 animate-pulse'
                    : 'border-white/10 bg-[#0B0F17] text-slate-300 hover:text-white hover:border-white/20'
                )}
                title={isReadingQuestion ? t('expo.stopReading') : t('expo.readQuestion')}
              >
                {isReadingQuestion ? (
                  <>
                    <VolumeX className="h-3.5 w-3.5 text-cyan-400" />
                    <span>{t('expo.stopReading')}</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="h-3.5 w-3.5 text-cyan-400" />
                    <span>{t('expo.readQuestion')}</span>
                  </>
                )}
              </button>
            </div>

            <div className="text-sm text-slate-200 leading-relaxed font-sans border-l-2 border-l-cyan-400 pl-3.5">
              <MarkdownRenderer content={currentQuestion.storyScenario} />
            </div>

            {/* AI Socratic Clue Drawer / Hint Box */}
            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/20 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-indigo-400" />
                  <span className="text-xs font-semibold text-indigo-300">Asisten Socratic AI Clue</span>
                </div>
                <button
                  type="button"
                  onClick={requestAiSocraticClue}
                  disabled={isFetchingClue}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/40 bg-indigo-500/15 px-3 py-1 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/30 transition-colors disabled:opacity-50"
                >
                  <Sparkles className="h-3 w-3 text-indigo-400" />
                  <span>{isFetchingClue ? 'Menyiapkan Clue...' : 'Tanya Hint Nexora'}</span>
                </button>
              </div>

              {aiClue && (
                <div className="text-xs text-indigo-100 bg-[#0B0F17]/80 rounded-xl p-3 border border-indigo-500/30 font-sans leading-relaxed animate-in fade-in duration-200">
                  <MarkdownRenderer content={aiClue} />
                </div>
              )}
            </div>

            {/* Multiple Choice Options Grid */}
            {currentQuestion.options && (
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 pt-2">
                {currentQuestion.options.map((opt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectOption(opt)}
                    className={cn(
                      'flex items-center justify-between rounded-2xl border p-3.5 text-left text-xs font-semibold transition-all',
                      selectedOption === opt
                        ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200 shadow-md ring-1 ring-cyan-400'
                        : 'border-white/10 bg-[#0B0F17]/80 text-slate-300 hover:border-white/20 hover:bg-[#0B0F17]'
                    )}
                  >
                    <span>{opt}</span>
                    <span
                      className={cn(
                        'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold border',
                        selectedOption === opt
                          ? 'border-cyan-400 bg-cyan-400 text-black'
                          : 'border-white/10 text-slate-400'
                      )}
                    >
                      {String.fromCharCode(65 + idx)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Voice Input & Manual Answer Bar */}
            <div className="flex items-center gap-2 pt-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={textAnswerInput}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  placeholder={
                    isListening
                      ? 'Mendengarkan ucapan jawaban Anda...'
                      : 'Ketik atau ucapkan jawaban Anda...'
                  }
                  className="w-full rounded-2xl border border-white/10 bg-[#0B0F17] px-4 py-3 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                />
              </div>

              {/* Mic Voice Button */}
              {isSpeechSupported && (
                <button
                  type="button"
                  onClick={handleToggleVoice}
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-2xl border transition-all shrink-0',
                    isListening
                      ? 'border-red-500 bg-red-500/20 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse'
                      : 'border-white/10 bg-[#0B0F17] text-slate-400 hover:text-white hover:border-white/20'
                  )}
                  title={isListening ? 'Hentikan rekaman suara' : 'Jawab dengan suara (Speech-to-Text)'}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
              )}

              {/* Submit Button */}
              <button
                type="button"
                onClick={() => submitAnswer()}
                disabled={!selectedOption && !textAnswerInput.trim()}
                className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-5 py-3 text-xs font-bold text-white shadow-lg transition-all hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>{t('expo.submit')}</span>
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. FEEDBACK ROUND PHASE ──────────────────────────────── */}
      {gamePhase === 'FEEDBACK' && lastRoundResult && currentQuestion && (
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-8 sm:px-6">
          <div
            className={cn(
              'rounded-3xl border p-6 backdrop-blur-xl shadow-2xl space-y-5',
              lastRoundResult.isCorrect
                ? 'border-emerald-500/40 bg-emerald-950/20 shadow-[0_0_30px_rgba(16,185,129,0.15)]'
                : 'border-amber-500/40 bg-amber-950/20 shadow-[0_0_30px_rgba(245,158,11,0.15)]'
            )}
          >
            {/* Header Result Status */}
            <div className="flex items-center gap-3">
              {lastRoundResult.isCorrect ? (
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  <XCircle className="h-6 w-6" />
                </div>
              )}

              <div>
                <h2 className="text-xl font-bold text-white">
                  {lastRoundResult.isCorrect ? 'Luar Biasa! Jawaban Benar 🎉' : 'Belum Tepat, Terus Semangat! 💪'}
                </h2>
                <p className="text-xs text-slate-400">
                  {lastRoundResult.isCorrect
                    ? `Kamu memperoleh +${lastRoundResult.scoreEarned} poin (${lastRoundResult.timeSpentSeconds}s waktu pengerjaan)`
                    : `Jawaban yang benar adalah: ${lastRoundResult.correctAnswer}`}
                </p>
              </div>
            </div>

            {/* Answer Comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="rounded-2xl border border-white/5 bg-[#0B0F17]/80 p-3">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Jawaban Kamu</span>
                <span className="text-xs font-semibold text-white">{lastRoundResult.userAnswer}</span>
              </div>
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-3">
                <span className="text-[10px] uppercase font-bold text-emerald-400 block">Kunci Jawaban</span>
                <span className="text-xs font-semibold text-emerald-200">{lastRoundResult.correctAnswer}</span>
              </div>
            </div>

            {/* Step-by-Step Explanation */}
            <div className="rounded-2xl border border-white/10 bg-[#0B0F17] p-4 space-y-2">
              <span className="text-[10px] uppercase font-bold text-cyan-400 block">Pembahasan Lengkap</span>
              <div className="text-xs text-slate-300 leading-relaxed font-sans">
                <MarkdownRenderer content={currentQuestion.explanation} />
              </div>
            </div>

            {/* Next Button */}
            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={nextQuestion}
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-6 py-3 text-xs font-bold text-white shadow-xl transition-all hover:scale-105"
              >
                <span>{currentIndex + 1 >= questions.length ? 'Lihat Hasil & Sertifikat' : 'Soal Berikutnya'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. FINAL SUMMARY & CERTIFICATE PHASE ─────────────────── */}
      {gamePhase === 'SUMMARY' && gameSummary && (
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6">
          {/* Certificate Card Container */}
          <div className="relative w-full overflow-hidden rounded-3xl border-2 border-cyan-500/40 bg-gradient-to-b from-[#131926] to-[#0B0F17] p-8 shadow-2xl backdrop-blur-xl">
            {/* Background Glow Accents */}
            <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-cyan-500/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-indigo-500/15 blur-3xl" />

            {/* Certificate Header */}
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-400 to-cyan-400 text-black shadow-lg">
                <Trophy className="h-7 w-7" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-400 block">
                Nexora AI Learning Platform
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                Sertifikat Pemecah Masalah AI
              </h2>
              <p className="text-xs text-slate-400">
                Diberikan atas keberhasilan menyelesaikan Tantangan Logika & Penalaran Tingkat{' '}
                <strong className="text-white">{gameSummary.gradeTier}</strong>
              </p>
            </div>

            {/* Badge Award Banner */}
            <div className="my-6 flex items-center justify-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-center">
              <Crown className="h-5 w-5 text-amber-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-amber-300 block">{gameSummary.badgeAwarded.title}</span>
                <span className="text-[10px] text-amber-200/80">{gameSummary.badgeAwarded.subtitle}</span>
              </div>
            </div>

            {/* Statistics Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-white/5 bg-[#0B0F17]/90 p-3 text-center">
                <span className="text-[10px] text-slate-400 block">Total Skor</span>
                <span className="text-base font-extrabold text-cyan-400 font-mono">
                  {gameSummary.totalScore}
                </span>
              </div>

              <div className="rounded-2xl border border-white/5 bg-[#0B0F17]/90 p-3 text-center">
                <span className="text-[10px] text-slate-400 block">Akurasi</span>
                <span className="text-base font-extrabold text-emerald-400 font-mono">
                  {gameSummary.accuracyPercentage}%
                </span>
              </div>

              <div className="rounded-2xl border border-white/5 bg-[#0B0F17]/90 p-3 text-center">
                <span className="text-[10px] text-slate-400 block">Best Streak</span>
                <span className="text-base font-extrabold text-amber-400 font-mono">
                  {gameSummary.streakMax} 🔥
                </span>
              </div>

              <div className="rounded-2xl border border-white/5 bg-[#0B0F17]/90 p-3 text-center">
                <span className="text-[10px] text-slate-400 block">Total Waktu</span>
                <span className="text-base font-extrabold text-indigo-400 font-mono">
                  {gameSummary.totalTimeSpentSeconds}s
                </span>
              </div>
            </div>

            {/* Certificate Footer Stamp */}
            <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-[10px] text-slate-500 font-mono">
              <span>Verified: Nexora AI Arena Engine</span>
              <span>{gameSummary.completedAt}</span>
            </div>
          </div>

          {/* Post-Game Actions */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={resetGame}
              className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/10 hover:text-white transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Main Lagi</span>
            </button>

            <Link
              href="/canvas"
              className="flex items-center gap-2 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-5 py-2.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-colors"
            >
              <Network className="h-4 w-4" />
              <span>Buka STEM Logic Canvas</span>
            </Link>

            <Link
              href="/tasks"
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg transition-all hover:opacity-95"
            >
              <BookOpen className="h-4 w-4" />
              <span>Study Planner & Tasks</span>
            </Link>
          </div>
        </div>
      )}

      {/* Global Arena Footer */}
      <footer className="border-t border-white/5 py-3 text-center text-[10px] text-slate-500">
        Nexora AI Expo Challenge Arena • Multi-Disciplinary Reasoning Engine
      </footer>
    </div>
  );
};
