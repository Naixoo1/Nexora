'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  HelpCircle,
  Trophy,
  ListOrdered,
  GraduationCap,
  ChevronDown,
  Check,
} from 'lucide-react';
import { useChatStore } from '@/stores/useChatStore';
import type { AcademicTutorMode } from '@/types/chat';
import { cn } from '@/lib/utils';

export const TUTOR_MODES: {
  id: AcademicTutorMode;
  name: string;
  shortLabel: string;
  description: string;
  icon: typeof Sparkles;
  accent: string;
  badgeBg: string;
  badgeBorder: string;
}[] = [
  {
    id: 'socratic',
    name: 'Socratic Tutor',
    shortLabel: 'Socratic',
    description: 'Guides you through guided inquiries, hints, and conceptual reflections.',
    icon: HelpCircle,
    accent: 'text-cyan-400',
    badgeBg: 'bg-cyan-500/10',
    badgeBorder: 'border-cyan-500/30',
  },
  {
    id: 'olympiad',
    name: 'Olympiad Coach',
    shortLabel: 'Olympiad',
    description: 'High-rigor proof techniques, invariants, extremals, and generalizations.',
    icon: Trophy,
    accent: 'text-amber-400',
    badgeBg: 'bg-amber-500/10',
    badgeBorder: 'border-amber-500/30',
  },
  {
    id: 'step_breakdown',
    name: 'Step Breakdown',
    shortLabel: 'Step-by-Step',
    description: 'Detailed calculation expansions with explicit KaTeX displays & verification.',
    icon: ListOrdered,
    accent: 'text-indigo-400',
    badgeBg: 'bg-indigo-500/10',
    badgeBorder: 'border-indigo-500/30',
  },
  {
    id: 'thesis_mentor',
    name: 'Thesis Mentor',
    shortLabel: 'Thesis Mentor',
    description: 'Academic writing, literature gap identification, and research methodology.',
    icon: GraduationCap,
    accent: 'text-purple-400',
    badgeBg: 'bg-purple-500/10',
    badgeBorder: 'border-purple-500/30',
  },
];

export const TutorModeSelector: React.FC = () => {
  const { activeTutorMode, setTutorMode } = useChatStore();
  const [isOpen, setIsOpen] = useState(false);

  const currentMode =
    TUTOR_MODES.find((m) => m.id === activeTutorMode) || TUTOR_MODES[0];
  const CurrentIcon = currentMode.icon;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition-all shadow-sm',
          currentMode.badgeBg,
          currentMode.badgeBorder,
          currentMode.accent,
          'hover:bg-white/10 hover:border-white/20'
        )}
      >
        <CurrentIcon className="h-3.5 w-3.5 shrink-0" />
        <span>{currentMode.shortLabel}</span>
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-10 z-50 w-72 rounded-2xl border border-white/10 bg-[#131926] p-2 shadow-2xl backdrop-blur-xl">
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Pedagogical Tutor Mode
            </div>
            <div className="mt-1 space-y-1">
              {TUTOR_MODES.map((mode) => {
                const Icon = mode.icon;
                const isSelected = mode.id === activeTutorMode;

                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => {
                      setTutorMode(mode.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-start gap-2.5 rounded-xl p-2 text-left text-xs transition-colors',
                      isSelected
                        ? 'bg-white/10 text-white font-medium'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    )}
                  >
                    <div
                      className={cn(
                        'mt-0.5 flex h-6 w-6 items-center justify-center rounded-lg border shrink-0',
                        mode.badgeBg,
                        mode.badgeBorder,
                        mode.accent
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">{mode.name}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-cyan-400" />}
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-400 leading-snug">
                        {mode.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
