'use client';

import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { GitFork, Sliders, TrendingUp, CheckSquare, CheckCircle2 } from 'lucide-react';
import type { StemCanvasNode } from '@/types/canvas';
import { LatexRenderer } from '../LatexRenderer';
import { MarkdownRenderer } from '@/components/chat/MarkdownRenderer';
import { useCanvasStore } from '@/stores/useCanvasStore';
import { cn } from '@/lib/utils';

export const WhatIfBranchNode: React.FC<NodeProps<StemCanvasNode>> = ({ id, data, selected }) => {
  const updateVariable = useCanvasStore((state) => state.updateVariable);
  const openNodeToTaskModal = useCanvasStore((state) => state.openNodeToTaskModal);
  const linkedTasks = useCanvasStore((state) => state.linkedTasks);
  const isLinked = Boolean(linkedTasks[id]);

  const customData = (data.customData as Record<string, unknown>) || {};
  const hypothesis = (customData.hypothesis as string) || data.title || 'What-If Simulation';
  const outcomeComparison =
    (customData.outcomeComparison as string) || data.content || 'Simulated parameter variation comparison.';
  const sensitivityScore = (customData.sensitivityScore as number) || 0.75;
  const variables = data.variables || [];

  return (
    <div
      className={cn(
        'group relative w-84 sm:w-96 rounded-2xl border transition-all duration-200 shadow-2xl backdrop-blur-md',
        'bg-[#131926] text-white',
        'border-cyan-500/40 hover:border-cyan-400',
        selected
          ? 'ring-2 ring-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.3)]'
          : 'shadow-[0_0_15px_rgba(6,182,212,0.1)]'
      )}
    >
      {/* Target Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !rounded-full !border-2 !border-[#0B0F17] !bg-cyan-400 transition-transform hover:!scale-125"
      />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-cyan-950/40 via-indigo-950/30 to-transparent px-4 py-2.5 rounded-t-2xl">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-indigo-500 text-white shadow-md shrink-0">
            <GitFork className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
              What-If Simulation
            </span>
            <h4 className="text-xs font-semibold text-white truncate max-w-[130px]">
              {hypothesis}
            </h4>
          </div>
        </div>

        {/* Right Badges & Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isLinked ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              Task Linked
            </span>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openNodeToTaskModal(id);
              }}
              className="inline-flex items-center gap-1 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-300 hover:bg-cyan-500/25 hover:border-cyan-400 transition-colors"
              title="Convert this simulation to a task"
            >
              <CheckSquare className="h-3 w-3" />
              <span>To Task</span>
            </button>
          )}

          <span className="inline-flex items-center gap-1 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-mono text-cyan-300">
            <TrendingUp className="h-3 w-3" />
            {Math.round(sensitivityScore * 100)}%
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3.5">
        {/* Hypothesis Narrative */}
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-2.5 text-xs text-cyan-200 leading-relaxed font-sans">
          <span className="font-semibold text-white">Hypothesis: </span>
          <MarkdownRenderer content={outcomeComparison} className="inline" />
        </div>

        {/* Simulated Formula Display */}
        {data.latexFormula && (
          <div className="rounded-xl border border-white/5 bg-[#0B0F17]/90 p-1">
            <LatexRenderer latex={data.latexFormula} displayMode="block" showCopyButton />
          </div>
        )}

        {/* Dynamic Parameter Delta Sliders */}
        {variables.length > 0 && (
          <div className="space-y-2 pt-1 border-t border-white/5">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-1">
                <Sliders className="h-3 w-3 text-cyan-400" />
                Live Variable Perturbations
              </span>
            </div>

            <div className="space-y-2">
              {variables.map((v) => (
                <div key={v.id} className="rounded-lg bg-[#0B0F17]/80 p-2 border border-white/5 space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-cyan-300">${v.symbol}$ ({v.name})</span>
                    <span className="text-white font-bold">
                      {v.value} {v.unit}
                    </span>
                  </div>

                  <input
                    type="range"
                    min={v.min ?? 0}
                    max={v.max ?? 100}
                    step={v.step ?? 1}
                    value={v.value}
                    onChange={(e) => updateVariable(v.id, parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Source Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !rounded-full !border-2 !border-[#0B0F17] !bg-cyan-400 transition-transform hover:!scale-125"
      />
    </div>
  );
};
