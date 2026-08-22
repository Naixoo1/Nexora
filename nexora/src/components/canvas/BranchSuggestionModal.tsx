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
    what_if_simulation: {
      label: 'What-If Simulation',
      icon: GitFork,
      color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    },
    deduction_step: {
      label: 'Logical Deduction',
      icon: Cpu,
      color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
    },
    alternative_method: {
      label: 'Alternative Method',
      icon: ArrowRight,
      color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    },
    counter_example: {
      label: 'Counter Example Check',
      icon: ShieldAlert,
      color: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
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
      <div className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-[#131926] p-6 sm:p-7 shadow-2xl transition-all">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => setBranchModalOpen(false)}
          className="absolute right-5 top-5 rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-sky-500 to-cyan-400 text-white shadow-[0_0_20px_rgba(6,182,212,0.35)]">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              AI Branch & What-If Suggestions
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">
              Explore alternative derivations, variable mutations, and scenario simulations.
            </p>
          </div>
        </div>

        {/* Suggestions List */}
        <div className="mt-6 space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
          {branchSuggestions.length === 0 ? (
            <div className="rounded-xl border border-white/5 bg-[#0B0F17] p-8 text-center text-xs text-slate-400">
              No branch suggestions generated for this node.
            </div>
          ) : (
            branchSuggestions.map((suggestion, idx) => {
              const config =
                branchTypeConfig[suggestion.branchType] ||
                branchTypeConfig.what_if_simulation;
              const Icon = config.icon;

              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-white/10 bg-[#0B0F17]/90 p-4.5 space-y-3 hover:border-cyan-500/40 transition-all shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold',
                          config.color
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {config.label}
                      </span>
                      <h4 className="text-sm font-bold text-white">
                        {suggestion.title}
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => applyBranchSuggestion(suggestion, selectedNodeId)}
                      className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-3 py-1.5 text-xs font-semibold text-white shadow hover:opacity-90 active:scale-95 transition-all"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Attach Branch</span>
                    </button>
                  </div>

                  <div className="text-xs text-slate-300 leading-relaxed">
                    <MarkdownRenderer content={suggestion.description} />
                  </div>

                  {suggestion.latexFormula && (
                    <div className="rounded-xl border border-white/5 bg-[#131926] p-1">
                      <LatexRenderer latex={suggestion.latexFormula} displayMode="block" />
                    </div>
                  )}

                  {suggestion.justification && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 italic">
                      <span className="font-semibold text-slate-300">Justification:</span>
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
