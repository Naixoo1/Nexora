'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  Lightbulb,
  ArrowRight,
  RotateCcw,
  Star,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Flame,
  Award,
  ArrowLeft,
  Network,
} from 'lucide-react';
import {
  PRIMARY_EXPO_QUESTIONS,
  type PrimaryExpoQuestion,
  type PrimaryQuestionOption,
} from '@/data/primary-expo-questions';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { ExpoReactionOverlay, type ExpoReactionType } from './ExpoReactionOverlay';
import { cn } from '@/lib/utils';

export interface PrimaryExpoArenaProps {
  onBackToMenu?: () => void;
}

export const PrimaryExpoArena: React.FC<PrimaryExpoArenaProps> = ({ onBackToMenu }) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [maxStreak, setMaxStreak] = useState<number>(0);
  const [totalAttempts, setTotalAttempts] = useState<number>(0);
  const [totalTimeSpentSeconds, setTotalTimeSpentSeconds] = useState<number>(0);
  const startTimeRef = useRef<number>(Date.now());

  const [activeMemeReaction, setActiveMemeReaction] = useState<ExpoReactionType | null>(null);
  const [showRetryModal, setShowRetryModal] = useState<boolean>(false);
  const [showHintModal, setShowHintModal] = useState<boolean>(false);
  const [showCertificate, setShowCertificate] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Text to speech calibrated specifically for Primary / SD kids (friendly pitch 1.25, clear rate 0.95)
  const { isPlaying, speak, stop } = useTextToSpeech({
    gradeLevel: 'PRIMARY',
    pitch: 1.25,
    rate: 0.95,
  });

  const currentQuestion: PrimaryExpoQuestion = PRIMARY_EXPO_QUESTIONS[currentIndex] || PRIMARY_EXPO_QUESTIONS[0];

  // Immediate audio teardown on question index change or component unmount
  useEffect(() => {
    stop();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    return () => {
      stop();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentIndex, stop]);

  const handleSpeakText = useCallback(
    (text: string) => {
      if (isMuted) return;
      speak(text, 'id');
    },
    [isMuted, speak]
  );

  const handleSelectOption = (option: PrimaryQuestionOption) => {
    // Immediately cancel any playing question audio when student answers
    stop();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setTotalAttempts((prev) => prev + 1);
    if (option.isCorrect) {
      setScore((prev) => prev + currentQuestion.points);
      setStreak((prev) => {
        const nextStreak = prev + 1;
        setMaxStreak((currMax) => Math.max(currMax, nextStreak));
        return nextStreak;
      });
      setActiveMemeReaction('win');
    } else {
      setStreak(0);
      setActiveMemeReaction('lose');
    }
  };

  const handleMemeDismiss = () => {
    const prevReaction = activeMemeReaction;
    setActiveMemeReaction(null);

    if (prevReaction === 'win') {
      if (currentIndex + 1 < PRIMARY_EXPO_QUESTIONS.length) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        // Trigger final completion celebration overlay
        setActiveMemeReaction('end');
      }
    } else if (prevReaction === 'lose') {
      setShowRetryModal(true);
    } else if (prevReaction === 'hint') {
      setShowHintModal(true);
    } else if (prevReaction === 'end') {
      const totalElapsed = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
      setTotalTimeSpentSeconds(totalElapsed);
      setShowCertificate(true);
    }
  };

  const handleOpenHint = () => {
    stop();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setActiveMemeReaction('hint');
  };

  const handleRestart = () => {
    startTimeRef.current = Date.now();
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setTotalAttempts(0);
    setTotalTimeSpentSeconds(0);
    setActiveMemeReaction(null);
    setShowRetryModal(false);
    setShowHintModal(false);
    setShowCertificate(false);
    stop();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  // Color mappings for the chunky 2x2 interactive cards
  const optionCardColors = [
    {
      bg: 'bg-emerald-500/15 hover:bg-emerald-500/25 active:bg-emerald-500/35 border-emerald-400/60 shadow-[0_0_20px_rgba(16,185,129,0.15)] text-emerald-100',
      badge: 'bg-emerald-500 text-slate-950',
      border: 'border-emerald-400',
    },
    {
      bg: 'bg-sky-500/15 hover:bg-sky-500/25 active:bg-sky-500/35 border-sky-400/60 shadow-[0_0_20px_rgba(56,189,248,0.15)] text-sky-100',
      badge: 'bg-sky-400 text-slate-950',
      border: 'border-sky-400',
    },
    {
      bg: 'bg-amber-500/15 hover:bg-amber-500/25 active:bg-amber-500/35 border-amber-400/60 shadow-[0_0_20px_rgba(245,158,11,0.15)] text-amber-100',
      badge: 'bg-amber-400 text-slate-950',
      border: 'border-amber-400',
    },
    {
      bg: 'bg-purple-500/15 hover:bg-purple-500/25 active:bg-purple-500/35 border-purple-400/60 shadow-[0_0_20px_rgba(168,85,247,0.15)] text-purple-100',
      badge: 'bg-purple-400 text-slate-950',
      border: 'border-purple-400',
    },
  ];

  // ── 1. FINAL SESSION COMPLETION CERTIFICATE SCREEN ─────────────
  if (showCertificate) {
    const totalPossibleScore = PRIMARY_EXPO_QUESTIONS.reduce((acc, q) => acc + q.points, 0);
    const starCount = Math.min(5, Math.max(3, Math.round((score / totalPossibleScore) * 5)));
    const accuracyPercentage = totalAttempts > 0 ? Math.round((PRIMARY_EXPO_QUESTIONS.length / totalAttempts) * 100) : 100;
    const completedDateString = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 animate-in fade-in zoom-in-95 duration-300">
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
              Sertifikat Pemecah Masalah Cilik AI
            </h2>
            <p className="text-xs text-slate-300">
              Diberikan atas keberhasilan menyelesaikan Tantangan Petualangan Logika Tingkat{' '}
              <strong className="text-cyan-400">PRIMARY (SD)</strong>
            </p>
          </div>

          {/* Achievement Rank Banner */}
          <div className="mt-6 flex items-center justify-center gap-4 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400 text-black font-black shadow-md">
              <Award className="h-6 w-6" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-bold text-white">Juara Cilik AI Solver</h3>
              <p className="text-xs text-cyan-300">Akurasi Gemilang & Penalaran Kreatif</p>
            </div>
          </div>

          {/* 5-Star Row */}
          <div className="my-4 flex items-center justify-center gap-2">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={cn(
                  'h-7 w-7 transition-transform duration-300',
                  i < starCount
                    ? 'fill-amber-400 text-amber-400 scale-110 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]'
                    : 'text-slate-600'
                )}
              />
            ))}
          </div>

          {/* 4-Metric Performance Grid */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-white/5 bg-[#0B0F17]/90 p-3 text-center">
              <span className="text-[10px] text-slate-400 block">Total Skor</span>
              <span className="text-base font-extrabold text-cyan-400 font-mono">
                {score} 🌟
              </span>
            </div>

            <div className="rounded-2xl border border-white/5 bg-[#0B0F17]/90 p-3 text-center">
              <span className="text-[10px] text-slate-400 block">Akurasi</span>
              <span className="text-base font-extrabold text-emerald-400 font-mono">
                {accuracyPercentage}%
              </span>
            </div>

            <div className="rounded-2xl border border-white/5 bg-[#0B0F17]/90 p-3 text-center">
              <span className="text-[10px] text-slate-400 block">Best Streak</span>
              <span className="text-base font-extrabold text-amber-400 font-mono">
                {maxStreak} 🔥
              </span>
            </div>

            <div className="rounded-2xl border border-white/5 bg-[#0B0F17]/90 p-3 text-center">
              <span className="text-[10px] text-slate-400 block">Total Waktu</span>
              <span className="text-base font-extrabold text-indigo-400 font-mono">
                {totalTimeSpentSeconds}s ⏱️
              </span>
            </div>
          </div>

          {/* Certificate Footer Stamp */}
          <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-[10px] text-slate-500 font-mono">
            <span>Verified: Nexora AI Arena Engine</span>
            <span>{completedDateString}</span>
          </div>
        </div>

        {/* Post-Game Action Buttons */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleRestart}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 px-5 py-2.5 text-xs font-extrabold text-slate-950 shadow-lg shadow-yellow-500/20 hover:scale-105 active:scale-95 transition-all"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Main Petualangan Lagi</span>
          </button>

          <Link
            href="/canvas"
            className="flex items-center gap-2 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-5 py-2.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-colors"
          >
            <Network className="h-4 w-4" />
            <span>Buka STEM Logic Canvas</span>
          </Link>

          {onBackToMenu && (
            <button
              type="button"
              onClick={onBackToMenu}
              className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Pilih Jenjang Lain</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-300">
      {/* ── TOP HEADER BAR ────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 pb-4">
        {/* Left: Back / Exit */}
        {onBackToMenu && (
          <button
            type="button"
            onClick={onBackToMenu}
            className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-xs sm:text-sm font-bold text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali</span>
          </button>
        )}

        {/* Center: Progress Pill */}
        <div className="flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs sm:text-sm font-extrabold text-cyan-300 shadow-sm">
          <Sparkles className="h-4 w-4 text-cyan-400 animate-pulse" />
          <span>
            Soal {currentIndex + 1} dari {PRIMARY_EXPO_QUESTIONS.length}
          </span>
        </div>

        {/* Right: Score, Streak, and Sound */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs sm:text-sm font-black text-amber-300">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span>{score}</span>
          </div>

          {streak > 1 && (
            <div className="flex items-center gap-1 rounded-2xl border border-orange-500/40 bg-orange-500/10 px-2.5 py-1.5 text-xs font-black text-orange-400 animate-bounce">
              <Flame className="h-4 w-4 fill-orange-400 text-orange-400" />
              <span>x{streak}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setIsMuted(!isMuted);
              if (!isMuted) stop();
            }}
            className={cn(
              'rounded-2xl border p-2 text-slate-300 transition-colors',
              isMuted
                ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                : 'border-white/15 bg-white/5 hover:bg-white/10 hover:text-white'
            )}
            title={isMuted ? 'Suara Dimatikan' : 'Suara Aktif'}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* ── MAIN INTERACTIVE QUESTION CARD ───────────────────────── */}
      <div className="my-auto flex flex-col items-center justify-center gap-5 py-2">
        {/* Themed Visual Storyboard Header (Vibrant & Prominent) */}
        <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border-2 border-cyan-400/30 bg-gradient-to-b from-sky-500/20 via-slate-900/70 to-[#0B0F17] p-3 sm:p-4 shadow-[0_0_35px_rgba(56,189,248,0.15)] backdrop-blur-xl">
          <div className="relative aspect-[16/8] sm:aspect-[16/7] w-full overflow-hidden rounded-2xl bg-gradient-to-b from-sky-100 to-sky-50 flex items-center justify-center p-2 shadow-inner">
            <img
              src={currentQuestion.animationAsset}
              alt={currentQuestion.title}
              className="h-full w-full object-contain transform transition-transform duration-500 hover:scale-105"
            />
            {/* Theme Badge */}
            <div className="absolute top-3 left-3 rounded-full border border-white/40 bg-slate-950/80 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-white backdrop-blur-md flex items-center gap-1.5 shadow-md">
              <span>{currentQuestion.theme === 'counting' ? '🍎 Berhitung' : currentQuestion.theme === 'geometry' ? '📐 Geometri' : currentQuestion.theme === 'balance' ? '⚖️ Timbangan' : currentQuestion.theme === 'space' ? '🚀 Antariksa' : '🦁 Satwa'}</span>
            </div>
          </div>
        </div>

        {/* Story Text Box with Cheerful Speaker Button */}
        <div className="w-full max-w-2xl rounded-3xl border-2 border-white/20 bg-gradient-to-b from-slate-900/95 to-[#0B0F17] p-5 sm:p-6 shadow-xl backdrop-blur-md flex items-start gap-4">
          <button
            type="button"
            onClick={() => handleSpeakText(currentQuestion.storyPrompt)}
            className={cn(
              'mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-all duration-300 active:scale-95 shadow-md',
              isPlaying
                ? 'border-cyan-400 bg-cyan-500 text-slate-950 shadow-cyan-500/30 scale-105 animate-pulse'
                : 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25'
            )}
            title="Dengarkan Cerita Soal"
          >
            <Volume2 className="h-6 w-6" />
          </button>
          <div className="flex-1">
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {currentQuestion.title}
            </h3>
            <p className="mt-1.5 text-base sm:text-lg leading-relaxed text-slate-200 font-medium">
              {currentQuestion.storyPrompt}
            </p>
          </div>
        </div>

        {/* ── 2x2 CHUNKY INTERACTIVE ANSWER GRID ─────────────────── */}
        <div className="grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
          {currentQuestion.options.map((option, idx) => {
            const color = optionCardColors[idx % optionCardColors.length];
            const letter = ['A', 'B', 'C', 'D'][idx];

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelectOption(option)}
                className={cn(
                  'group relative flex items-center gap-4 rounded-3xl border-2 p-5 text-left transition-all duration-200 cursor-pointer active:scale-95',
                  color.bg
                )}
              >
                {/* Letter / Emoji Badge */}
                <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-black text-lg shadow-md', color.badge)}>
                  <span>{option.icon || letter}</span>
                </div>
                {/* Option Text */}
                <div className="flex-1">
                  <span className="text-xs font-bold uppercase tracking-wider opacity-70">
                    Pilihan {letter}
                  </span>
                  <p className="text-lg sm:text-xl font-extrabold text-white group-hover:translate-x-1 transition-transform">
                    {option.label}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Bottom Hint Trigger Button */}
        <div className="flex items-center justify-center pt-1">
          <button
            type="button"
            onClick={handleOpenHint}
            className="flex items-center gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-5 py-2.5 text-sm font-bold text-amber-300 shadow-lg shadow-amber-500/10 hover:bg-amber-500/20 active:scale-95 transition-all"
          >
            <Lightbulb className="h-4 w-4 text-amber-400" />
            <span>Butuh Bantuan? Buka Petunjuk Ajaib 💡</span>
          </button>
        </div>
      </div>

      {/* ── FULL SCREEN MEME POP-UP OVERLAY ────────────────────────── */}
      {activeMemeReaction && (
        <ExpoReactionOverlay
          type={activeMemeReaction}
          onDismiss={handleMemeDismiss}
          gradeLevel="PRIMARY"
          isMuted={isMuted}
        />
      )}

      {/* ── RETRY MODAL DIALOG (SHOWN AFTER LOSE MEME DISMISSES) ────── */}
      {showRetryModal && (
        <div className="fixed inset-0 z-[99990] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl border-2 border-indigo-500/60 bg-gradient-to-b from-indigo-950/90 via-slate-900/95 to-[#0B0F17] p-6 sm:p-8 text-center shadow-2xl shadow-indigo-500/20 animate-in zoom-in-95 duration-300">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-indigo-200 tracking-tight">
              Ayo coba lagi! Kamu pasti bisa! 💪
            </h3>
            <p className="mt-2 text-sm text-slate-300">
              Jangan berkecil hati ya. Tarik napas, pelajari ceritanya lagi atau buka petunjuk ajaib di bawah!
            </p>

            <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowRetryModal(false);
                  stop();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Coba Jawab Lagi</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowRetryModal(false);
                  handleOpenHint();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 py-3.5 text-sm font-bold text-amber-300 hover:bg-amber-500/20 active:scale-95 transition-all"
              >
                <Lightbulb className="h-4 w-4" />
                <span>Buka Petunjuk 💡</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HINT MODAL DIALOG (SHOWN AFTER HINT MEME DISMISSES) ────── */}
      {showHintModal && (
        <div className="fixed inset-0 z-[99990] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl border-2 border-amber-500/60 bg-gradient-to-b from-amber-950/90 via-slate-900/95 to-[#0B0F17] p-6 sm:p-8 text-center shadow-2xl shadow-amber-500/20 animate-in zoom-in-95 duration-300">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-amber-300 tracking-tight">
              Petunjuk Ajaib 💡
            </h3>

            <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-left text-sm sm:text-base text-amber-100 leading-relaxed font-medium">
              <p>{currentQuestion.hint}</p>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowHintModal(false);
                stop();
              }}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 py-3.5 text-base font-extrabold text-slate-950 shadow-lg shadow-yellow-500/30 hover:scale-105 active:scale-95 transition-all"
            >
              <span>Aku Paham! Kembali ke Soal 🚀</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
