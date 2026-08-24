'use client';

import React from 'react';
import {
  Sparkles,
  X,
  Plus,
  GitFork,
  ArrowRight,
  ShieldAlert,
  Cpu,
  Zap,
  Lightbulb,
} from 'lucide-react';
import { useCanvasStore } from '@/stores/useCanvasStore';
import { LatexRenderer } from './LatexRenderer';
import { MarkdownRenderer } from '@/components/chat/MarkdownRenderer';
import { cn } from '@/lib/utils';

export const BranchSuggestionModal: React.FC = () => {
  const {
    isBranchModalOpen,
    branchSuggestions,
    selectedNodeId,
    setBranchModalOpen,
    applyBranchSuggestion,
  } = useCanvasStore();

  if (!isBranchModalOpen || !selectedNodeId) return null;

  const branchTypeConfig = {
    alternative_method: {
      label: 'Sudut 1: Metode Alternatif',
      icon: Lightbulb,
      badgeColor: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/15',
      borderColor: 'border-emerald-500/30 hover:border-emerald-500/60',
      glow: 'shadow-[0_0_20px_rgba(16,185,129,0.1)]',
    },
    deduction_step: {
      label: 'Sudut 2: Kelanjutan Logis',
      icon: Zap,
      badgeColor: 'text-indigo-300 border-indigo-500/40 bg-indigo-500/15',
      borderColor: 'border-indigo-500/30 hover:border-indigo-500/60',
      glow: 'shadow-[0_0_20px_rgba(99,102,241,0.1)]',
    },
    what_if_simulation: {
      label: 'Sudut 3: Eksplorasi What-If',
      icon: GitFork,
      badgeColor: 'text-cyan-300 border-cyan-500/40 bg-cyan-500/15',
      borderColor: 'border-cyan-500/30 hover:border-cyan-500/60',
      glow: 'shadow-[0_0_20px_rgba(6,182,212,0.1)]',
    },
    counter_example: {
      label: 'Uji Kasus Batas / Kontradiksi',
      icon: ShieldAlert,
      badgeColor: 'text-rose-300 border-rose-500/40 bg-rose-500/15',
      borderColor: 'border-rose-500/30 hover:border-rose-500/60',
      glow: 'shadow-[0_0_20px_rgba(244,63,94,0.1)]',
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Frosted Glass Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={() => setBranchModalOpen(false)}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-3xl rounded-3xl border border-white/10 bg-[#131926] p-6 sm:p-7 shadow-2xl transition-all">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => setBranchModalOpen(false)}
          className="absolute right-5 top-5 rounded-xl p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-sky-500 to-cyan-400 text-white shadow-[0_0_25px_rgba(6,182,212,0.35)]">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                Rekomendasi Cabang AI & Simulasi What-If
              </h3>
              <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                3 Sudut Pedagogis
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Pilih dari 3 cabang cerdas: Metode Alternatif, Kelanjutan Logis, atau Eksplorasi Variasi Skenario.
            </p>
          </div>
        </div>

        {/* Suggestions List */}
        <div className="mt-6 space-y-4 max-h-[62vh] overflow-y-auto pr-1">
          {branchSuggestions.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-[#0B0F17] p-8 text-center text-xs text-slate-400">
              Tidak ada rekomendasi cabang yang dihasilkan untuk node ini.
            </div>
          ) : (
            branchSuggestions.map((suggestion, idx) => {
              const configKey =
                (suggestion.angleType as keyof typeof branchTypeConfig) ||
                (suggestion.branchType as keyof typeof branchTypeConfig) ||
                'what_if_simulation';
              const config = branchTypeConfig[configKey] || branchTypeConfig.what_if_simulation;
              const Icon = config.icon;

              return (
                <div
                  key={idx}
                  className={cn(
                    'rounded-2xl border bg-[#0B0F17]/95 p-5 space-y-3.5 transition-all duration-200 shadow-xl',
                    config.borderColor,
                    config.glow
                  )}
                >
                  {/* Top Bar: Angle Badge + Title + Action */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold',
                            config.badgeColor
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {config.label}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white leading-tight">
                        {suggestion.title}
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => applyBranchSuggestion(suggestion, selectedNodeId)}
                      className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-3.5 py-2 text-xs font-bold text-white shadow-lg hover:opacity-90 active:scale-95 transition-all shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Pasang Cabang</span>
                    </button>
                  </div>

                  {/* Hypothesis (if provided) */}
                  {suggestion.hypothesis && (
                    <div className="rounded-xl border border-white/5 bg-[#131926]/70 px-3 py-2 text-xs text-slate-300">
                      <span className="font-semibold text-cyan-300 block text-[10px] uppercase tracking-wider mb-0.5">
                        Hipotesis / Ide Kunci:
                      </span>
                      <MarkdownRenderer content={suggestion.hypothesis} />
                    </div>
                  )}

                  {/* Explanation Description */}
                  <div className="text-xs text-slate-300 leading-relaxed font-sans">
                    <MarkdownRenderer content={suggestion.description} />
                  </div>

                  {/* Formula Preview */}
                  {suggestion.latexFormula && (
                    <div className="rounded-xl border border-white/10 bg-[#131926] p-2">
                      <LatexRenderer latex={suggestion.latexFormula} displayMode="block" />
                    </div>
                  )}

                  {/* Pedagogical Justification */}
                  {suggestion.justification && (
                    <div className="flex items-start gap-1.5 text-[11px] text-slate-400 pt-1 border-t border-white/5">
                      <span className="font-semibold text-slate-300 shrink-0">Manfaat Pedagogis:</span>
                      <MarkdownRenderer content={suggestion.justification} className="inline" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
