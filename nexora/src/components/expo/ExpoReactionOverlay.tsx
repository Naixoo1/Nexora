'use client';

import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Sparkles, ArrowRight } from 'lucide-react';

export type ExpoReactionType = 'win' | 'lose' | 'hint' | 'end';

export interface ExpoReactionOverlayProps {
  type: ExpoReactionType;
  onDismiss: () => void;
  autoDismissMs?: number;
  customTitle?: string;
  customSubtitle?: string;
}

interface ReactionConfig {
  title: string;
  subtitle: string;
  titleColor: string;
  badgeBg: string;
  glowClass: string;
  borderClass: string;
  gifSrc: string;
  fallbackSvg: string;
}

const REACTION_CONFIGS: Record<ExpoReactionType, ReactionConfig> = {
  win: {
    title: 'BENAR! 🎉',
    subtitle: 'Luar biasa, poin bertambah!',
    titleColor: 'text-emerald-300',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40',
    glowClass: 'shadow-[0_0_80px_rgba(16,185,129,0.35)]',
    borderClass: 'border-emerald-400/70',
    gifSrc: '/media/reactions/win.gif',
    fallbackSvg: '/media/reactions/win.svg',
  },
  lose: {
    title: 'YAH, SALAH! 😅',
    subtitle: 'Jangan menyerah, kamu pasti bisa!',
    titleColor: 'text-rose-300',
    badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-400/40',
    glowClass: 'shadow-[0_0_80px_rgba(244,63,94,0.35)]',
    borderClass: 'border-rose-400/70',
    gifSrc: '/media/reactions/lose.gif',
    fallbackSvg: '/media/reactions/lose.svg',
  },
  hint: {
    title: 'PETUNJUK DATANG! 💡',
    subtitle: 'Petunjuk ajaib membantumu berpikir!',
    titleColor: 'text-amber-300',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
    glowClass: 'shadow-[0_0_80px_rgba(245,158,11,0.35)]',
    borderClass: 'border-amber-400/70',
    gifSrc: '/media/reactions/hint.gif',
    fallbackSvg: '/media/reactions/hint.svg',
  },
  end: {
    title: 'HOREEE! TAMAT! 🏆',
    subtitle: 'Semua tantangan selesai dengan gemilang!',
    titleColor: 'text-cyan-300',
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40',
    glowClass: 'shadow-[0_0_80px_rgba(34,211,238,0.35)]',
    borderClass: 'border-cyan-400/70',
    gifSrc: '/media/reactions/end.gif',
    fallbackSvg: '/media/reactions/win.svg',
  },
};

export const ExpoReactionOverlay: React.FC<ExpoReactionOverlayProps> = ({
  type,
  onDismiss,
  autoDismissMs = 2200,
  customTitle,
  customSubtitle,
}) => {
  const config = REACTION_CONFIGS[type] || REACTION_CONFIGS.win;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      onDismiss();
    }, autoDismissMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [onDismiss, autoDismissMs]);

  const handleDismiss = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    onDismiss();
  };

  return (
    <div
      role="dialog"
      aria-label="Reaction Meme Popup"
      onClick={handleDismiss}
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-4 cursor-pointer select-none animate-in fade-in duration-200"
    >
      <div className="relative flex flex-col items-center max-w-sm sm:max-w-md md:max-w-lg w-full text-center">
        {/* Large High-Impact Header (Quizizz Meme Style) */}
        <h2
          className={cn(
            'text-4xl sm:text-5xl md:text-6xl font-black tracking-tight drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] animate-in zoom-in-75 duration-300',
            config.titleColor
          )}
        >
          {customTitle || config.title}
        </h2>
        <p className="mt-2 text-sm sm:text-base md:text-lg font-bold text-slate-200 drop-shadow-md">
          {customSubtitle || config.subtitle}
        </p>

        {/* Big Prominent GIF Container */}
        <div
          className={cn(
            'mt-4 sm:mt-6 relative w-full aspect-square max-h-[48vh] sm:max-h-[55vh] overflow-hidden rounded-3xl border-4 bg-slate-950/90 p-2 sm:p-3 transition-transform duration-300 hover:scale-102 flex items-center justify-center animate-in zoom-in-90 duration-300',
            config.borderClass,
            config.glowClass
          )}
        >
          <img
            src={config.gifSrc}
            onError={(e) => {
              e.currentTarget.src = config.fallbackSvg;
            }}
            alt={type}
            className="h-full w-full object-contain rounded-2xl"
          />
        </div>

        {/* Tap Prompt */}
        <div className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold text-white/90 backdrop-blur-md shadow-lg animate-pulse">
          <span>Ketuk di mana saja untuk lanjut</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </div>
  );
};
