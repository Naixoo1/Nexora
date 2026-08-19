'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Network,
  Plus,
  Search,
  ChevronRight,
  Trash2,
  Cpu,
  Layers,
  Loader2,
  X,
} from 'lucide-react';
import type { CanvasSummary, ApiResponse } from '@/types/canvas';
import { GlobalNavbar } from '@/components/layout/GlobalNavbar';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';
import { cn } from '@/lib/utils';

export default function CanvasListPage() {
  const router = useRouter();
  const [canvases, setCanvases] = useState<CanvasSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New Canvas Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Kalkulus & Analisis');
  const [statement, setStatement] = useState('');
  const [latexFormula, setLatexFormula] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const load = async () => {
      try {
        const response = await fetch('/api/canvas');
        const json: ApiResponse<{ items: CanvasSummary[] }> = await response.json();
        if (!isCancelled && response.ok && json.success && json.data) {
          setCanvases(json.data.items || []);
        }
      } catch (err) {
        console.error('Failed to fetch canvases:', err);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      isCancelled = true;
    };
  }, []);

  const handleCreateCanvas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    setError(null);

    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      category: category.trim() || undefined,
      initialProblem: statement.trim()
        ? {
            statement: statement.trim(),
            domain: category.trim() || 'Calculus',
            targetGoal: 'Derive formula step by step',
            latexFormula: latexFormula.trim() || undefined,
            variables: [
              {
                id: 'var-v0',
                name: 'v_0',
                symbol: 'v_0',
                label: 'Initial Velocity',
                value: 20,
                defaultValue: 20,
                min: 0,
                max: 100,
                step: 1,
                unit: 'm/s',
                isIndependent: true,
              },
              {
                id: 'var-theta',
                name: 'theta',
                symbol: '\\theta',
                label: 'Launch Angle',
                value: 45,
                defaultValue: 45,
                min: 0,
                max: 90,
                step: 1,
                unit: 'deg',
                isIndependent: true,
              },
            ],
          }
        : undefined,
    };

    try {
      const response = await fetch('/api/canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.message || 'Failed to create canvas');
      }

      setIsCreateModalOpen(false);
      router.push(`/canvas/${json.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating canvas');
      setIsSubmitting(false);
    }
  };

  const handleDeleteCanvas = async (canvasId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this STEM canvas graph?')) {
      return;
    }

    try {
      await fetch(`/api/canvas/${canvasId}`, { method: 'DELETE' });
      setCanvases(canvases.filter((c) => c.id !== canvasId));
    } catch (err) {
      console.error('Failed to delete canvas:', err);
    }
  };

  const filteredCanvases = canvases.filter((c) => {
    if (selectedCategory !== 'all' && c.category !== selectedCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        c.title.toLowerCase().includes(q) ||
        (c.description?.toLowerCase().includes(q) ?? false) ||
        (c.category?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  return (
    <main className="min-h-screen bg-[#0B0F17] text-[#F1F5F9] antialiased">
      <GlobalNavbar />

      {/* Glow Effects */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/3 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute top-20 right-1/4 h-80 w-80 rounded-full bg-indigo-600/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400">
              <Network className="h-4 w-4" />
              <span>Interactive STEM Studio</span>
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-white">
              STEM Logic Tree Canvases
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              Deconstruct complex mathematical derivations, simulate &quot;What-If&quot; variable shifts, and verify proofs step by step.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:opacity-95 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>New Logic Tree</span>
          </button>
        </header>

        {/* Filter & Search Bar */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search canvases, formulas, or domains..."
              className="w-full rounded-xl border border-white/10 bg-[#131926] py-2.5 pl-10 pr-4 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            {(['all', 'Kalkulus & Analisis', 'Fisika & Mekanika', 'Aljabar Linear'] as const).map(
              (cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border',
                    selectedCategory === cat
                      ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
                      : 'border-white/5 bg-[#131926] text-slate-400 hover:bg-white/10 hover:text-white'
                  )}
                >
                  {cat === 'all' ? 'All Domains' : cat}
                </button>
              )
            )}
          </div>
        </div>

        {/* Canvas Cards Grid */}
        {isLoading ? (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-2xl border border-white/5 bg-[#131926]/60"
              />
            ))}
          </div>
        ) : filteredCanvases.length === 0 ? (
          <div className="mt-12 flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-[#131926]/40 p-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/20">
              <Network className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-white">No STEM Canvases Yet</h3>
            <p className="mt-1 max-w-md text-xs sm:text-sm text-slate-400">
              Create your first interactive logic tree canvas to deconstruct algorithms and explore mathematical &quot;What-If&quot; simulations.
            </p>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-5 flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:opacity-90 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Create First Canvas</span>
            </button>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCanvases.map((canvas) => (
              <Link
                key={canvas.id}
                href={`/canvas/${canvas.id}`}
                className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-[#131926] p-5 shadow-xl transition-all duration-200 hover:-translate-y-1 hover:border-cyan-500/40 hover:shadow-[0_10px_30px_rgba(6,182,212,0.15)]"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
                      {canvas.category || 'STEM Logic Tree'}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteCanvas(canvas.id, e)}
                      className="rounded p-1 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                      title="Delete canvas"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <h3 className="mt-3 text-base font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
                    {canvas.title}
                  </h3>

                  {canvas.description && (
                    <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                      {canvas.description}
                    </p>
                  )}
                </div>

                <div className="mt-5 border-t border-white/5 pt-3.5 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-3 font-mono text-[11px]">
                    <span className="flex items-center gap-1">
                      <Cpu className="h-3.5 w-3.5 text-indigo-400" />
                      {canvas.nodeCount} nodes
                    </span>
                    <span className="flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5 text-cyan-400" />
                      {canvas.edgeCount} edges
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-cyan-400 font-medium group-hover:translate-x-1 transition-transform">
                    <span>Open</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* New Canvas Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
            onClick={() => !isSubmitting && setIsCreateModalOpen(false)}
          />

          <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#131926] p-6 sm:p-7 shadow-2xl transition-all">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute right-5 top-5 rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 text-white shadow-lg">
                <Network className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Create STEM Logic Canvas</h3>
                <p className="text-xs text-slate-400">Initialize interactive derivation workspace</p>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateCanvas} className="mt-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Canvas Title <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Penurunan Gerak Parabola & Simulasi Hambatan Udara"
                  className="w-full rounded-xl border border-white/10 bg-[#0B0F17] px-3.5 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Domain / Category
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Fisika Klasik, Kalkulus Integral"
                  className="w-full rounded-xl border border-white/10 bg-[#0B0F17] px-3.5 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ringkasan atau tujuan dari logic tree canvas ini..."
                  className="w-full rounded-xl border border-white/10 bg-[#0B0F17] p-3 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Initial Problem Statement (Optional)
                </label>
                <textarea
                  rows={2}
                  value={statement}
                  onChange={(e) => setStatement(e.target.value)}
                  placeholder="Deskripsikan masalah awal atau soal yang akan diturunkan..."
                  className="w-full rounded-xl border border-white/10 bg-[#0B0F17] p-3 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Initial LaTeX Formula (Optional)
                </label>
                <input
                  type="text"
                  value={latexFormula}
                  onChange={(e) => setLatexFormula(e.target.value)}
                  placeholder="e.g. y(t) = v_0 \\sin(\\theta) t - \\frac{1}{2}gt^2"
                  className="w-full rounded-xl border border-white/10 bg-[#0B0F17] px-3.5 py-2 text-xs sm:text-sm text-white font-mono placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-400 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-lg hover:opacity-95 active:scale-98 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Creating Canvas Studio...</span>
                    </>
                  ) : (
                    <span>Launch STEM Canvas</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <OnboardingModal />
    </main>
  );
}
