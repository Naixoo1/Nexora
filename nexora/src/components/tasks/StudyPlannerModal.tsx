'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Calendar,
  Layers,
  Tag,
  Loader2,
  GraduationCap,
  Calculator,
  Code,
  AlertCircle,
  LogIn,
} from 'lucide-react';
import { useTaskStore } from '@/stores/useTaskStore';
import { authClient } from '@/lib/auth-client';
import type { PlannerGeneratePayload } from '@/types/task';
import { cn } from '@/lib/utils';

const PRESET_PROMPTS = [
  {
    title: 'UTBK Fisika Modern',
    category: 'Ujian Masuk PTN',
    prompt: 'Rencanakan jadwal belajar komprehensif untuk Fisika Modern UTBK: Dualisme Gelombang-Partikel, Efek Fotolistrik, dan Teori Relativitas Khusus.',
    icon: Calculator,
  },
  {
    title: 'Skripsi Metodologi',
    category: 'Tesis & Skripsi',
    prompt: 'Susun langkah pengerjaan Skripsi Bab 3 Metodologi Penelitian: Desain instrumen kualitatif, validasi triangulasi data, dan analisis tematik.',
    icon: GraduationCap,
  },
  {
    title: 'Struktur Data & Algoritma',
    category: 'Informatika',
    prompt: 'Roadmap penguasaan Dynamic Programming, Graph Traversal (DFS/BFS), dan Binary Search Tree untuk persiapan ujian semester.',
    icon: Code,
  },
];

export const StudyPlannerModal: React.FC = () => {
  const { isPlannerModalOpen, isGeneratingPlan, error, openPlannerModal, generateStudyPlan, clearError } =
    useTaskStore();
  const { data: session, isPending: isAuthPending } = authClient.useSession();

  const [prompt, setPrompt] = useState('');
  const [category, setCategory] = useState('Ujian & Studi');
  const [dueDate, setDueDate] = useState('');
  const [maxTasks, setMaxTasks] = useState(8);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  if (!isPlannerModalOpen) return null;

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: typeof window !== 'undefined' ? window.location.pathname : '/tasks',
      });
    } catch (err) {
      console.error('Sign-in failed:', err);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) {
      setLocalError('Please sign in to generate and save your AI study plan.');
      return;
    }

    if (!prompt.trim()) {
      setLocalError('Please describe your study topic or learning objective.');
      return;
    }

    setLocalError(null);
    clearError();

    const payload: PlannerGeneratePayload = {
      prompt: prompt.trim(),
      category: category.trim() || undefined,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      maxTasks,
    };

    const success = await generateStudyPlan(payload);
    if (success) {
      setPrompt('');
      setDueDate('');
      openPlannerModal(false);
    }
  };

  const handleApplyPreset = (preset: (typeof PRESET_PROMPTS)[0]) => {
    setPrompt(preset.prompt);
    setCategory(preset.category);
    setLocalError(null);
  };

  const isAuthenticated = Boolean(session?.user);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Frosted Glass Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity"
        onClick={() => !isGeneratingPlan && openPlannerModal(false)}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-xl rounded-2xl border border-white/10 bg-[#131926] p-6 sm:p-7 shadow-2xl transition-all">
        {/* Close Button */}
        <button
          type="button"
          disabled={isGeneratingPlan}
          onClick={() => openPlannerModal(false)}
          className="absolute right-5 top-5 rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-sky-500 to-cyan-400 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              AI Study Planner
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">
              Generate atomic study milestones and hierarchical sub-tasks
            </p>
          </div>
        </div>

        {/* Auth Guard Banner if not logged in */}
        {!isAuthPending && !isAuthenticated && (
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 p-3.5 text-xs text-cyan-200">
            <div className="flex items-center gap-2">
              <LogIn className="h-4 w-4 shrink-0 text-cyan-400" />
              <span>Sign in with Google to generate and sync study plans to your account.</span>
            </div>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 px-3 py-1.5 font-semibold text-white shadow transition-all hover:opacity-90 active:scale-95 shrink-0"
            >
              {isSigningIn ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              <span>Sign in with Google</span>
            </button>
          </div>
        )}

        {/* Error Alert */}
        {(error || localError) && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{localError || error}</span>
          </div>
        )}

        {/* Preset Chips (purely optional autofill) */}
        <div className="mt-5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Quick Topic Presets
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {PRESET_PROMPTS.map((preset, idx) => {
              const Icon = preset.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="flex items-center gap-2 rounded-xl border border-white/5 bg-[#0B0F17]/60 p-2.5 text-left text-xs transition-all hover:border-cyan-500/40 hover:bg-[#1A2234]"
                >
                  <Icon className="h-4 w-4 text-cyan-400 shrink-0" />
                  <span className="font-medium text-slate-200 truncate">{preset.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Prompt Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Study Goal / Subject Topic <span className="text-cyan-400">*</span>
            </label>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Persiapan Ujian Akhir Semester Fisika Kuantum & Struktur Atom..."
              className="w-full rounded-xl border border-white/10 bg-[#0B0F17] p-3 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/50"
              disabled={isGeneratingPlan}
              required
            />
          </div>

          {/* Grid: Category & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Category */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1">
                <Tag className="h-3.5 w-3.5 text-slate-400" />
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Ujian, Skripsi, Riset"
                className="w-full rounded-xl border border-white/10 bg-[#0B0F17] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                disabled={isGeneratingPlan}
              />
            </div>

            {/* Target Due Date */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                Target Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#0B0F17] px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none [color-scheme:dark]"
                disabled={isGeneratingPlan}
              />
            </div>
          </div>

          {/* Max Tasks Slider */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              <span className="flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-slate-400" />
                Task Scope Breakdown
              </span>
              <span className="font-mono text-cyan-400">{maxTasks} tasks</span>
            </div>
            <input
              type="range"
              min={3}
              max={15}
              value={maxTasks}
              onChange={(e) => setMaxTasks(Number(e.target.value))}
              className="w-full accent-cyan-400 bg-slate-800 rounded-lg h-2"
              disabled={isGeneratingPlan}
            />
          </div>

          {/* Submit Button with Inline Auth Check */}
          <div className="pt-2">
            {!isAuthenticated ? (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSigningIn}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-lg bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400 hover:opacity-95 active:scale-[0.99] transition-all"
              >
                {isSigningIn ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  <LogIn className="h-4 w-4 text-white" />
                )}
                <span>Sign in with Google to Generate Plan</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={isGeneratingPlan}
                className={cn(
                  'w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-lg transition-all',
                  'bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400 hover:opacity-95 active:scale-[0.99]',
                  isGeneratingPlan && 'opacity-80 cursor-wait'
                )}
              >
                {isGeneratingPlan ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>Synthesizing Atomic Study Plan...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Generate Study Plan</span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
