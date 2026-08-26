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
  gifSrc: string;
  fallbackSvg: string;
}

const REACTION_CONFIGS: Record<ExpoReactionType, ReactionConfig> = {
  win: {
    title: 'BENAR! 🎉',
    subtitle: 'Luar biasa, poin bertambah!',
    titleColor: 'text-emerald-300',
    gifSrc: '/media/reactions/win.gif',
    fallbackSvg: '/media/reactions/win.svg',
  },
  lose: {
    title: 'YAH, SALAH! 😅',
    subtitle: 'Jangan menyerah, kamu pasti bisa!',
    titleColor: 'text-rose-300',
    gifSrc: '/media/reactions/lose.gif',
    fallbackSvg: '/media/reactions/lose.svg',
  },
  hint: {
    title: 'PETUNJUK DATANG! 💡',
    subtitle: 'Petunjuk ajaib membantumu berpikir!',
    titleColor: 'text-amber-300',
    gifSrc: '/media/reactions/hint.gif',
    fallbackSvg: '/media/reactions/hint.svg',
  },
  end: {
    title: 'HOREEE! TAMAT! 🏆',
    subtitle: 'Semua tantangan selesai dengan gemilang!',
    titleColor: 'text-cyan-300',
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
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm p-4 cursor-pointer select-none animate-in fade-in duration-200"
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

        {/* Clean Floating GIF Container */}
        <div className="mt-4 sm:mt-6 relative w-full aspect-square max-h-[50vh] sm:max-h-[60vh] overflow-hidden rounded-2xl shadow-2xl flex items-center justify-center animate-in zoom-in-95 duration-200">
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
