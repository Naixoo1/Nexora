import React, { useState, useMemo } from 'react';
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
  Clock,
  BookOpen,
  School,
  Building,
} from 'lucide-react';
import { useTaskStore } from '@/stores/useTaskStore';
import { useTranslation } from '@/hooks/useTranslation';
import { authClient } from '@/lib/auth-client';
import type { PlannerGeneratePayload, GradeLevel } from '@/types/task';
import { classifyStudyContext } from '@/services/study-planner-classifier';
import { cn } from '@/lib/utils';

const PRESET_PROMPTS = [
  {
    title: 'Drama Basa Sunda',
    category: 'Bahasa & Sastra',
    prompt: 'Susun rencana latihan naskah Drama Basa Sunda (Paguneman) tema kapahlawanan: draf naskah, undak usuk basa, olah vokal, dan gladi pementasan.',
    gradeLevel: 'SENIOR_HIGH' as GradeLevel,
    icon: BookOpen,
  },
  {
    title: 'UTBK Fisika Modern',
    category: 'Ujian Masuk PTN',
    prompt: 'Rencanakan jadwal belajar komprehensif untuk Fisika Modern UTBK: Dualisme Gelombang-Partikel, Efek Fotolistrik, dan Teori Relativitas Khusus.',
    gradeLevel: 'SENIOR_HIGH' as GradeLevel,
    icon: Calculator,
  },
  {
    title: 'Linimasa Sejarah Kemerdekaan',
    category: 'Sejarah & Sosial',
    prompt: 'Buat rencana belajar Sejarah Indonesia: Linimasa Peristiwa Rengasdengklok, Proklamasi 17 Agustus 1945, dan pembentukan kelengkapan negara.',
    gradeLevel: 'JUNIOR_HIGH' as GradeLevel,
    icon: GraduationCap,
  },
  {
    title: 'English Academic Dialogue',
    category: 'Language Arts',
    prompt: 'Create a preparation roadmap for English Parliamentary Debate on AI Ethics: argument drafting, vocabulary drills, rebuttal cues, and mock debate.',
    gradeLevel: 'SENIOR_HIGH' as GradeLevel,
    icon: Code,
  },
];

const GRADE_LEVELS: { id: GradeLevel; label: string; subLabel: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'PRIMARY', label: 'SD / Primary', subLabel: 'Kelas 1 - 6 (Tuntunan Ringkas)', icon: School },
  { id: 'JUNIOR_HIGH', label: 'SMP / Junior High', subLabel: 'Kelas 7 - 9 (Struktur Bertahap)', icon: BookOpen },
  { id: 'SENIOR_HIGH', label: 'SMA / Senior High', subLabel: 'Kelas 10 - 12 / PTN (Analitis HOTS)', icon: Building },
];

export const StudyPlannerModal: React.FC = () => {
  const { t } = useTranslation();
  const { isPlannerModalOpen, isGeneratingPlan, error, openPlannerModal, generateStudyPlan, clearError } =
    useTaskStore();
  const { data: session, isPending: isAuthPending } = authClient.useSession();

  const [prompt, setPrompt] = useState('');
  const [category, setCategory] = useState('Ujian & Studi');
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>('SENIOR_HIGH');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('23:59');
  const [maxTasks, setMaxTasks] = useState(8);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Live subject taxonomy classification preview
  const liveClassification = useMemo(() => {
    if (!prompt.trim()) return null;
    return classifyStudyContext(prompt, category, gradeLevel);
  }, [prompt, category, gradeLevel]);

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

    let fullIsoDueDate: string | undefined = undefined;
    if (dueDate) {
      const timePart = dueTime || '23:59';
      const parsed = new Date(`${dueDate}T${timePart}:00`);
      if (!isNaN(parsed.getTime())) {
        fullIsoDueDate = parsed.toISOString();
      }
    }

    const payload: PlannerGeneratePayload = {
      prompt: prompt.trim(),
      category: category.trim() || undefined,
      gradeLevel,
      dueDate: fullIsoDueDate,
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
    setGradeLevel(preset.gradeLevel);
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
      <div className="relative w-full max-w-xl rounded-2xl border border-white/10 bg-[#131926] p-6 sm:p-7 shadow-2xl transition-all max-h-[90vh] overflow-y-auto">
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
              {t('planner.title')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">
              Generate curriculum-calibrated study plans with forward chronological timelines
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

        {/* Preset Chips */}
        <div className="mt-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Kurikulum & Topik Populer
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {PRESET_PROMPTS.map((preset, idx) => {
              const Icon = preset.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="flex items-center gap-1.5 rounded-xl border border-white/5 bg-[#0B0F17]/60 p-2 text-left text-xs transition-all hover:border-cyan-500/40 hover:bg-[#1A2234]"
                >
                  <Icon className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                  <span className="font-medium text-slate-200 truncate">{preset.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Grade Level Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Jenjang Pendidikan / Grade Tier <span className="text-cyan-400">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {GRADE_LEVELS.map((g) => {
                const Icon = g.icon;
                const isSelected = gradeLevel === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setGradeLevel(g.id)}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1 rounded-xl border p-2.5 text-center transition-all',
                      isSelected
                        ? 'border-cyan-400 bg-cyan-500/15 text-white ring-1 ring-cyan-400/30 shadow-md font-semibold'
                        : 'border-white/5 bg-[#0B0F17] text-slate-400 hover:border-white/20 hover:text-slate-200'
                    )}
                  >
                    <Icon className={cn('h-4 w-4', isSelected ? 'text-cyan-400' : 'text-slate-400')} />
                    <span className="text-xs">{g.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prompt Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Tujuan Belajar / Topik Penugasan <span className="text-cyan-400">*</span>
            </label>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Latihan naskah drama Bahasa Sunda, Analisis Bab 3 Skripsi, Persiapan UTBK Fisika Modern..."
              className="w-full rounded-xl border border-white/10 bg-[#0B0F17] p-3 text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/50"
              disabled={isGeneratingPlan}
              required
            />

            {/* Live Taxonomy Detection Preview */}
            {liveClassification && (
              <div className="mt-1.5 flex items-center justify-between gap-2 rounded-lg bg-cyan-950/20 border border-cyan-500/20 px-2.5 py-1 text-[11px] text-cyan-300">
                <span className="flex items-center gap-1 font-mono truncate">
                  <Sparkles className="h-3 w-3 text-cyan-400 shrink-0" />
                  Mata Pelajaran: <strong>{liveClassification.subject}</strong> ({liveClassification.subjectCategory.replace('_', ' ')})
                </span>
                <span className="text-[10px] text-slate-400 shrink-0">
                  {liveClassification.forbidMathFormulas ? 'Bebas Rumus' : 'STEM LaTeX Aktif'}
                </span>
              </div>
            )}
          </div>

          {/* Grid: Category, Target Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
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
                placeholder="e.g. Ujian, Tugas, Tesis"
                className="w-full rounded-xl border border-white/10 bg-[#0B0F17] px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                disabled={isGeneratingPlan}
              />
            </div>

            {/* Target Due Date */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                Target Tanggal
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#0B0F17] px-3 py-2 text-xs sm:text-sm text-white focus:border-cyan-400 focus:outline-none [color-scheme:dark]"
                disabled={isGeneratingPlan}
              />
            </div>

            {/* Target Due Time */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                Waktu (HH:mm)
              </label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#0B0F17] px-3 py-2 text-xs sm:text-sm text-white focus:border-cyan-400 focus:outline-none [color-scheme:dark]"
                disabled={isGeneratingPlan}
              />
            </div>
          </div>

          {/* Max Tasks Slider */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              <span className="flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-slate-400" />
                Skala Target Milestone
              </span>
              <span className="font-mono text-cyan-400">{maxTasks} milestones</span>
            </div>
            <input
              type="range"
              min={3}
              max={12}
              value={maxTasks}
              onChange={(e) => setMaxTasks(Number(e.target.value))}
              className="w-full accent-cyan-400 bg-slate-800 rounded-lg h-2"
              disabled={isGeneratingPlan}
            />
          </div>

          {/* Submit Button */}
          <div className="pt-1">
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
                    <span>{t('planner.generating')}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>{t('planner.generate')}</span>
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

