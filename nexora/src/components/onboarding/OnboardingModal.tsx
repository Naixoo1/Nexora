'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Network,
  CheckSquare,
  Mic,
  Brain,
  GraduationCap,
  Calculator,
  Atom,
  Binary,
  Compass,
} from 'lucide-react';
import { LatexRenderer } from '../canvas/LatexRenderer';
import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

export const ORIENTATION_STORAGE_KEY = 'nexora_orientation_completed';
export const ONBOARDING_STORAGE_KEY = 'nexora_orientation_completed';
export const LEGACY_ONBOARDING_KEY = 'nexora_onboarding_completed_v1';

export const STUDY_TRACKS = [
  {
    id: 'math',
    title: 'Olympiad Math & Calculus',
    description: 'Calculus, Real Analysis, Linear Algebra, Number Theory & Proofs',
    icon: Calculator,
    color: 'from-indigo-500 to-cyan-500',
    borderColor: 'border-cyan-500/40',
    accentText: 'text-cyan-400',
  },
  {
    id: 'physics',
    title: 'Theoretical Physics',
    description: 'Classical Mechanics, Electrodynamics, Quantum Systems',
    icon: Atom,
    color: 'from-cyan-500 to-teal-400',
    borderColor: 'border-teal-500/40',
    accentText: 'text-teal-400',
  },
  {
    id: 'cs',
    title: 'Computer Science',
    description: 'Algorithms, Data Structures, Complexity Theory & Systems',
    icon: Binary,
    color: 'from-indigo-600 to-purple-500',
    borderColor: 'border-indigo-500/40',
    accentText: 'text-indigo-400',
  },
  {
    id: 'engineering',
    title: 'Engineering & Applied STEM',
    description: 'Control Systems, Thermodynamics, Signals & Structural Models',
    icon: Compass,
    color: 'from-amber-500 to-orange-400',
    borderColor: 'border-amber-500/40',
    accentText: 'text-amber-400',
  },
  {
    id: 'thesis',
    title: 'Thesis & Academic Research',
    description: 'Literature synthesis, Empirical validation & Paper methodology',
    icon: GraduationCap,
    color: 'from-purple-500 to-pink-500',
    borderColor: 'border-purple-500/40',
    accentText: 'text-purple-400',
  },
];

export const OnboardingModal: React.FC = () => {
  const { data: session, isPending } = authClient.useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedTrack, setSelectedTrack] = useState('math');

  // Check completion flag on mount and when session loads
  useEffect(() => {
    if (typeof window === 'undefined' || isPending) return;

    const isLocalCompleted =
      localStorage.getItem(ORIENTATION_STORAGE_KEY) === 'true' ||
      localStorage.getItem(LEGACY_ONBOARDING_KEY) === 'true';

    const isUserCompleted = Boolean(
      (session?.user as { onboardingCompleted?: boolean })?.onboardingCompleted
    );

    if (!isLocalCompleted && !isUserCompleted) {
      setIsOpen(true);
    }

    // Listen for manual tutorial restart event
    const handleRestart = () => {
      setStep(1);
      setIsOpen(true);
    };

    window.addEventListener('nexora:restart-onboarding', handleRestart);
    return () => window.removeEventListener('nexora:restart-onboarding', handleRestart);
  }, [session, isPending]);

  const handleComplete = async () => {
    // 1. Set local storage keys
    if (typeof window !== 'undefined') {
      localStorage.setItem(ORIENTATION_STORAGE_KEY, 'true');
      localStorage.setItem(LEGACY_ONBOARDING_KEY, 'true');
      localStorage.setItem('nexora_preferred_track', selectedTrack);

      // Notify other components on the page immediately
      window.dispatchEvent(new CustomEvent('nexora:orientation-completed'));
    }

    // 2. If authenticated, persist to Neon DB
    if (session?.user) {
      try {
        await fetch('/api/user/orientation-complete', {
          method: 'POST',
        });
      } catch (err) {
        console.warn('Failed to sync orientation status with server:', err);
      }
    }

    // 3. Close modal immediately
    setIsOpen(false);
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Frosted Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={handleSkip}
      />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-[#131926] shadow-2xl backdrop-blur-xl">
        {/* Top Progress Track Bar */}
        <div className="flex h-1.5 w-full bg-white/5">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-sky-400 to-cyan-400 transition-all duration-300 ease-out"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="relative h-8 w-8 overflow-hidden rounded-lg border border-white/10 bg-[#0B0F17] p-0.5">
              <Image
                src="/logo.jpeg"
                alt="Nexora"
                width={32}
                height={32}
                className="h-full w-full object-contain rounded"
              />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Student Orientation</h3>
              <p className="text-[11px] text-cyan-400 font-mono">Step {step} of 4</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Skip Tutorial
          </button>
        </div>

        {/* Step Content */}
        <div className="p-6 sm:p-8 min-h-[380px] flex flex-col justify-between">
          {/* STEP 1: Track Selection */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Welcome to Nexora</span>
                </div>
                <h2 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-white">
                  What is your primary academic focus?
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-400">
                  Nexora configures AI tutor prompts, LaTeX templates, and formula solvers tailored to your curriculum.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                {STUDY_TRACKS.map((track) => {
                  const Icon = track.icon;
                  const isSelected = selectedTrack === track.id;

                  return (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => setSelectedTrack(track.id)}
                      className={cn(
                        'flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-all',
                        isSelected
                          ? 'border-cyan-400 bg-cyan-950/25 shadow-[0_0_20px_rgba(6,182,212,0.15)] ring-1 ring-cyan-400/40'
                          : 'border-white/10 bg-[#0B0F17] hover:border-white/20 hover:bg-white/5'
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow shrink-0',
                          track.color
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                            {track.title}
                          </h4>
                          {isSelected && (
                            <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" />
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                          {track.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Logic Tree & KaTeX */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
                  <Network className="h-3.5 w-3.5" />
                  <span>Feature 1: STEM Logic Canvas</span>
                </div>
                <h2 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Deconstruct complex math step-by-step
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-400">
                  Build interactive derivation graphs with automatic KaTeX validation, What-If parameter sliders, and theorem dependency trees.
                </p>
              </div>

              {/* Interactive Visual Card Mock */}
              <div className="rounded-2xl border border-white/10 bg-[#0B0F17] p-4 space-y-3 shadow-inner">
                <div className="flex items-center justify-between border-b border-white/5 pb-2 text-xs">
                  <span className="font-semibold text-cyan-300">Kinematic Trajectory &bull; Node #2</span>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-400 border border-emerald-500/30">
                    Verified Step
                  </span>
                </div>

                <div className="overflow-hidden rounded-xl bg-[#131926] p-2 text-center">
                  <LatexRenderer
                    latex="y(t) = v_0 t \\sin(\\theta) - \\frac{1}{2} g t^2"
                    displayMode="block"
                    showCopyButton={false}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Dynamic Parameter Simulation:</span>
                  <LatexRenderer
                    latex="v_0 = 24.5\text{ m/s}, \quad \theta = 45^\circ"
                    displayMode="inline"
                    className="font-mono text-cyan-300 font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: One-Click Task Bridge */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                  <CheckSquare className="h-3.5 w-3.5" />
                  <span>Feature 2: Canvas-to-Task Bridge</span>
                </div>
                <h2 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Convert derivations into study tasks
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-400">
                  Turn difficult derivation nodes into tracked study milestones with one click. Tasks preserve mathematical formulations and link directly back to your canvas.
                </p>
              </div>

              {/* Task Conversion Card Preview */}
              <div className="rounded-2xl border border-white/10 bg-[#0B0F17] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-cyan-400" />
                    <span className="text-xs sm:text-sm font-bold text-white">
                      [Derivation Step] Master Velocity Decomposition
                    </span>
                  </div>
                  <span className="rounded-full bg-cyan-950/40 px-2 py-0.5 text-[10px] text-cyan-300 border border-cyan-500/30">
                    STEM Canvas Origin
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Sub-tasks generated with estimated deadlines, priority flags, and live KaTeX previews for exam drills.
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: AI Copilot & Voice */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
                  <Brain className="h-3.5 w-3.5" />
                  <span>Feature 3: Context-Aware AI Copilot</span>
                </div>
                <h2 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Dictate with Voice & Paste Screenshots
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-400">
                  Brainstorm with 4 academic tutor modes (Socratic, Olympiad, Step Breakdown, Thesis Mentor) with speech-to-text dictation and textbook screenshot analysis.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="rounded-2xl border border-white/10 bg-[#0B0F17] p-3.5 space-y-1.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                    <Mic className="h-4 w-4" />
                  </div>
                  <h4 className="text-xs font-bold text-white">Voice Dictation</h4>
                  <p className="text-[11px] text-slate-400">
                    Real-time speech recognition for complex problem queries.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0B0F17] p-3.5 space-y-1.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <h4 className="text-xs font-bold text-white">Multimodal Paste</h4>
                  <p className="text-[11px] text-slate-400">
                    Paste problem screenshots directly from clipboard or attach PDFs.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-6 border-t border-white/10 mt-6">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition-all"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400 px-5 py-2 text-xs font-bold text-white shadow-lg transition-all hover:opacity-95 active:scale-95"
              >
                <span>Continue</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleComplete}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400 px-6 py-2.5 text-xs font-bold text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all hover:opacity-95 active:scale-95"
              >
                <Sparkles className="h-4 w-4" />
                <span>Get Started</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
