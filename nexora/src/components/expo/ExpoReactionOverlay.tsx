import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { useLanguageStore } from '@/stores/useLanguageStore';
import type { ExpoGradeTier } from '@/types/expo';

export type ExpoReactionType = 'win' | 'lose' | 'hint' | 'end';

export interface ExpoReactionOverlayProps {
  type: ExpoReactionType;
  onDismiss: () => void;
  autoDismissMs?: number;
  customTitle?: string;
  customSubtitle?: string;
  customVoiceover?: string;
  gradeLevel?: ExpoGradeTier;
  isMuted?: boolean;
}

interface ReactionConfig {
  title: string;
  subtitle: string;
  titleColor: string;
  gifSrc: string;
  fallbackSvg: string;
}

const DEFAULT_VOICEOVER: Record<ExpoReactionType, { id: string; en: string }> = {
  win: {
    id: 'Luar biasa, jawabanmu tepat!',
    en: 'Outstanding, your answer is correct!',
  },
  lose: {
    id: 'Ayo coba lagi, periksa kembali langkah penalaranmu!',
    en: "Let's try again, re-examine your reasoning steps!",
  },
  hint: {
    id: 'Perhatikan petunjuk berikut untuk membantumu berpikir.',
    en: 'Notice the following hint to help your reasoning.',
  },
  end: {
    id: 'Selamat! Kamu telah menyelesaikan seluruh tantangan penalaran AI!',
    en: 'Congratulations! You have completed all AI reasoning challenges!',
  },
};

const PRIMARY_VOICEOVER: Record<ExpoReactionType, { id: string; en: string }> = {
  win: {
    id: 'Hebat! Jawaban kamu benar sekali!',
    en: 'Great job! Your answer is absolutely right!',
  },
  lose: {
    id: 'Ayo coba lagi! Kamu pasti bisa!',
    en: "Let's try again! You can do it!",
  },
  hint: {
    id: 'Perhatikan petunjuk berikut untuk membantumu berpikir.',
    en: 'Notice the following hint to help your reasoning.',
  },
  end: {
    id: 'Horeee! Kamu berhasil menyelesaikan semua tantangan dengan gemilang!',
    en: 'Hooray! You completed all challenges with flying colors!',
  },
};

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
  customVoiceover,
  gradeLevel,
  isMuted = false,
}) => {
  const config = REACTION_CONFIGS[type] || REACTION_CONFIGS.win;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const locale = useLanguageStore((state) => state.locale);
  const targetLocale: 'id' | 'en' = locale === 'en' ? 'en' : 'id';

  const { speak, stop } = useTextToSpeech({
    gradeLevel: gradeLevel || 'SENIOR_HIGH',
    pitch: gradeLevel === 'PRIMARY' ? 1.25 : 1.0,
    rate: gradeLevel === 'PRIMARY' ? 0.95 : 1.05,
  });

  const textToSpeak =
    customVoiceover ||
    (gradeLevel === 'PRIMARY'
      ? PRIMARY_VOICEOVER[type]?.[targetLocale] || PRIMARY_VOICEOVER[type].id
      : DEFAULT_VOICEOVER[type]?.[targetLocale] || DEFAULT_VOICEOVER[type].id);

  // Trigger TTS voiceover on overlay mount and guarantee previous audio cancellation
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (!isMuted && textToSpeak) {
      speak(textToSpeak, targetLocale);
    }
    return () => {
      stop();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [type, textToSpeak, targetLocale, isMuted, speak, stop]);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      stop();
      onDismiss();
    }, autoDismissMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      stop();
    };
  }, [onDismiss, autoDismissMs, stop]);

  const handleDismiss = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    stop();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
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
