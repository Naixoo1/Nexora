'use client';

import React, { useState, useCallback } from 'react';
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
} from 'lucide-react';
import {
  PRIMARY_EXPO_QUESTIONS,
  type PrimaryExpoQuestion,
  type PrimaryQuestionOption,
} from '@/data/primary-expo-questions';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { cn } from '@/lib/utils';

export interface PrimaryExpoArenaProps {
  onBackToMenu?: () => void;
}

type ReactionOverlayType = 'WIN' | 'LOSE' | 'HINT' | null;

export const PrimaryExpoArena: React.FC<PrimaryExpoArenaProps> = ({ onBackToMenu }) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [activeOverlay, setActiveOverlay] = useState<ReactionOverlayType>(null);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Text to speech calibrated specifically for Primary / SD kids (friendly pitch 1.25, clear rate 0.95)
  const { isPlaying, speak, stop } = useTextToSpeech({
    gradeLevel: 'PRIMARY',
    pitch: 1.25,
    rate: 0.95,
  });

  const currentQuestion: PrimaryExpoQuestion = PRIMARY_EXPO_QUESTIONS[currentIndex] || PRIMARY_EXPO_QUESTIONS[0];

  const handleSpeakText = useCallback(
    (text: string) => {
      if (isMuted) return;
      speak(text, 'id');
    },
    [isMuted, speak]
  );

  const handleSelectOption = (option: PrimaryQuestionOption) => {
    if (option.isCorrect) {
      setScore((prev) => prev + currentQuestion.points);
      setStreak((prev) => prev + 1);
      setActiveOverlay('WIN');
      handleSpeakText('Hebat! Jawaban kamu benar sekali!');
    } else {
      setStreak(0);
      setActiveOverlay('LOSE');
      handleSpeakText('Ayo coba lagi! Kamu pasti bisa!');
    }
  };

  const handleOpenHint = () => {
    setActiveOverlay('HINT');
    handleSpeakText(currentQuestion.hint);
  };

  const handleNextQuestion = () => {
    setActiveOverlay(null);
    stop();
    if (currentIndex + 1 < PRIMARY_EXPO_QUESTIONS.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsCompleted(true);
      handleSpeakText('Selamat! Kamu berhasil menyelesaikan semua tantangan dengan luar biasa!');
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setActiveOverlay(null);
    setIsCompleted(false);
    stop();
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

  // ── 1. GAME COMPLETED SUMMARY SCREEN ───────────────────────
  if (isCompleted) {
    const totalPossibleScore = PRIMARY_EXPO_QUESTIONS.reduce((acc, q) => acc + q.points, 0);
    const starCount = Math.min(5, Math.max(3, Math.round((score / totalPossibleScore) * 5)));

    return (
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="relative rounded-3xl border border-amber-500/40 bg-gradient-to-b from-amber-500/10 via-slate-900/90 to-[#0B0F17] p-8 sm:p-12 shadow-2xl backdrop-blur-xl max-w-2xl w-full">
          {/* Reaction Win Badge */}
          <div className="mx-auto -mt-20 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-tr from-amber-400 to-yellow-200 p-2 shadow-2xl shadow-yellow-500/30">
            <img
              src="/media/reactions/win.gif"
              onError={(e) => {
                e.currentTarget.src = '/media/reactions/win.svg';
              }}
              alt="Celebration Winner"
              className="h-full w-full object-contain"
            />
          </div>

          <h2 className="mt-6 text-3xl sm:text-4xl font-extrabold text-amber-300 tracking-tight">
            Juara Cilik Hebat! 🎉
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-300">
            Kamu telah menyelesaikan semua petualangan logika matematika dengan luar biasa!
          </p>

          {/* Stars display */}
          <div className="my-6 flex items-center justify-center gap-2">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={cn(
                  'h-8 w-8 transition-transform duration-300',
                  i < starCount
                    ? 'fill-amber-400 text-amber-400 scale-110 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]'
                    : 'text-slate-600'
                )}
              />
            ))}
          </div>

          {/* Score Box */}
          <div className="grid grid-cols-2 gap-4 my-6">
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
              <span className="text-xs text-amber-300/80 font-bold uppercase tracking-wider">Total Skor</span>
              <p className="text-3xl font-black text-amber-300 mt-1">{score} 🌟</p>
            </div>
            <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
              <span className="text-xs text-cyan-300/80 font-bold uppercase tracking-wider">Tantangan Selesai</span>
              <p className="text-3xl font-black text-cyan-300 mt-1">
                {PRIMARY_EXPO_QUESTIONS.length}/{PRIMARY_EXPO_QUESTIONS.length} 🎯
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6">
            <button
              type="button"
              onClick={handleRestart}
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 px-6 py-3.5 text-base font-extrabold text-slate-950 shadow-lg shadow-yellow-500/20 hover:scale-105 active:scale-95 transition-all"
            >
              <RotateCcw className="h-5 w-5" />
              <span>Main Petualangan Lagi</span>
            </button>
            {onBackToMenu && (
              <button
                type="button"
                onClick={onBackToMenu}
                className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-6 py-3.5 text-base font-bold text-white hover:bg-white/20 active:scale-95 transition-all"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Pilih Jenjang Lain</span>
              </button>
            )}
          </div>
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
      <div className="my-auto flex flex-col items-center justify-center gap-6 py-2">
        {/* Themed Visual Storyboard Header */}
        <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border-2 border-white/10 bg-slate-900/60 p-2 shadow-2xl backdrop-blur-md">
          <div className="relative aspect-[16/8] sm:aspect-[16/7] w-full overflow-hidden rounded-2xl bg-[#0F172A] flex items-center justify-center">
            <img
              src={currentQuestion.animationAsset}
              alt={currentQuestion.title}
              className="h-full w-full object-contain transform transition-transform duration-500 hover:scale-105"
            />
            {/* Theme Badge */}
            <div className="absolute top-3 left-3 rounded-full border border-white/20 bg-slate-950/70 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white backdrop-blur-md flex items-center gap-1.5">
              <span>{currentQuestion.theme === 'counting' ? '🍎 Berhitung' : currentQuestion.theme === 'geometry' ? '📐 Geometri' : currentQuestion.theme === 'balance' ? '⚖️ Timbangan' : currentQuestion.theme === 'space' ? '🚀 Antariksa' : '🦁 Satwa'}</span>
            </div>
          </div>
        </div>

        {/* Story Text Box with Cheerful Speaker Button */}
        <div className="w-full max-w-2xl rounded-3xl border-2 border-white/15 bg-gradient-to-b from-slate-900/90 to-[#0B0F17] p-5 sm:p-6 shadow-xl backdrop-blur-md flex items-start gap-4">
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
        <div className="flex items-center justify-center pt-2">
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

      {/* ── REACTION OVERLAY MODALS (WIN / LOSE / HINT) ─────────────── */}
      {activeOverlay && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
          {/* WIN OVERLAY MODAL */}
          {activeOverlay === 'WIN' && (
            <div className="relative w-full max-w-lg rounded-3xl border-2 border-emerald-500/60 bg-gradient-to-b from-emerald-950/90 via-slate-900/95 to-[#0B0F17] p-6 sm:p-8 text-center shadow-2xl shadow-emerald-500/20 animate-in zoom-in-95 duration-300">
              <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-400/40 p-2 shadow-xl shadow-emerald-500/30">
                <img
                  src="/media/reactions/win.gif"
                  onError={(e) => {
                    e.currentTarget.src = '/media/reactions/win.svg';
                  }}
                  alt="Win Reaction"
                  className="h-full w-full object-contain"
                />
              </div>

              <h3 className="mt-5 text-2xl sm:text-3xl font-extrabold text-emerald-300 tracking-tight">
                Hebat! Kamu Benar! 🎉
              </h3>
              <p className="mt-1 font-bold text-amber-300 text-base">+{currentQuestion.points} Bintang 🌟</p>

              {/* Explanation Card */}
              <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-left text-sm text-emerald-100 leading-relaxed">
                <p className="font-semibold">{currentQuestion.explanation}</p>
              </div>

              <button
                type="button"
                onClick={handleNextQuestion}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 py-3.5 text-base font-extrabold text-slate-950 shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all"
              >
                <span>Lanjut ke Soal Berikutnya</span>
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* LOSE / RETRY OVERLAY MODAL */}
          {activeOverlay === 'LOSE' && (
            <div className="relative w-full max-w-lg rounded-3xl border-2 border-indigo-500/60 bg-gradient-to-b from-indigo-950/90 via-slate-900/95 to-[#0B0F17] p-6 sm:p-8 text-center shadow-2xl shadow-indigo-500/20 animate-in zoom-in-95 duration-300">
              <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-indigo-500/20 border border-indigo-400/40 p-2 shadow-xl shadow-indigo-500/30">
                <img
                  src="/media/reactions/lose.gif"
                  onError={(e) => {
                    e.currentTarget.src = '/media/reactions/lose.svg';
                  }}
                  alt="Encouraging Retry Reaction"
                  className="h-full w-full object-contain"
                />
              </div>

              <h3 className="mt-5 text-2xl sm:text-3xl font-extrabold text-indigo-200 tracking-tight">
                Ayo coba lagi! Kamu pasti bisa! 💪
              </h3>
              <p className="mt-2 text-sm text-slate-300">
                Jangan berkecil hati ya. Tarik napas, pelajari soalnya lagi atau buka petunjuk ajaib di bawah!
              </p>

              <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setActiveOverlay(null);
                    stop();
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Coba Lagi Sekarang</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenHint}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 py-3.5 text-sm font-bold text-amber-300 hover:bg-amber-500/20 active:scale-95 transition-all"
                >
                  <Lightbulb className="h-4 w-4" />
                  <span>Buka Petunjuk 💡</span>
                </button>
              </div>
            </div>
          )}

          {/* HINT OVERLAY MODAL */}
          {activeOverlay === 'HINT' && (
            <div className="relative w-full max-w-lg rounded-3xl border-2 border-amber-500/60 bg-gradient-to-b from-amber-950/90 via-slate-900/95 to-[#0B0F17] p-6 sm:p-8 text-center shadow-2xl shadow-amber-500/20 animate-in zoom-in-95 duration-300">
              <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-amber-500/20 border border-amber-400/40 p-2 shadow-xl shadow-amber-500/30">
                <img
                  src="/media/reactions/hint.gif"
                  onError={(e) => {
                    e.currentTarget.src = '/media/reactions/hint.svg';
                  }}
                  alt="Hint Reaction"
                  className="h-full w-full object-contain"
                />
              </div>

              <h3 className="mt-5 text-2xl sm:text-3xl font-extrabold text-amber-300 tracking-tight">
                Petunjuk Ajaib 💡
              </h3>

              <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-left text-sm sm:text-base text-amber-100 leading-relaxed font-medium">
                <p>{currentQuestion.hint}</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveOverlay(null);
                  stop();
                }}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 py-3.5 text-base font-extrabold text-slate-950 shadow-lg shadow-yellow-500/30 hover:scale-105 active:scale-95 transition-all"
              >
                <span>Aku Paham! Kembali ke Soal 🚀</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
