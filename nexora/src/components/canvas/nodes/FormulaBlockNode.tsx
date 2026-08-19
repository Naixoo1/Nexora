'use client';

import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Binary, Sliders, Calculator, CheckSquare, CheckCircle2 } from 'lucide-react';
import type { StemCanvasNode } from '@/types/canvas';
import { LatexRenderer } from '../LatexRenderer';
import { useCanvasStore } from '@/stores/useCanvasStore';
import { cn } from '@/lib/utils';

export const FormulaBlockNode: React.FC<NodeProps<StemCanvasNode>> = ({ id, data, selected }) => {
  const updateVariable = useCanvasStore((state) => state.updateVariable);
  const openNodeToTaskModal = useCanvasStore((state) => state.openNodeToTaskModal);
  const linkedTasks = useCanvasStore((state) => state.linkedTasks);
  const isLinked = Boolean(linkedTasks[id]);

  const variables = data.variables || [];
  const customData = (data.customData as Record<string, unknown>) || {};
  const renderedResult = (customData.renderedResult as string) || '';

  return (
    <div
      className={cn(
        'group relative w-80 sm:w-96 rounded-2xl border transition-all duration-200 shadow-2xl backdrop-blur-md',
        'bg-[#131926] text-white',
        'border-indigo-500/40 hover:border-indigo-400',
        selected
          ? 'ring-2 ring-indigo-400 shadow-[0_0_25px_rgba(99,102,241,0.3)]'
          : 'shadow-[0_0_15px_rgba(99,102,241,0.1)]'
      )}
    >
      {/* Target Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !rounded-full !border-2 !border-[#0B0F17] !bg-indigo-400 transition-transform hover:!scale-125"
      />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-indigo-950/40 via-cyan-950/20 to-transparent px-4 py-2.5 rounded-t-2xl">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md shrink-0">
            <Binary className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
              Formula Block
            </span>
            <h4 className="text-xs font-semibold text-white truncate max-w-[130px]">
              {data.title || 'Expression'}
            </h4>
          </div>
        </div>

        {/* Right Header Badges & Actions */}
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
              className="inline-flex items-center gap-1 rounded-md border border-indigo-500/30 bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-300 hover:bg-indigo-500/25 hover:border-indigo-400 transition-colors"
              title="Convert this formula to a task"
            >
              <CheckSquare className="h-3 w-3" />
              <span>To Task</span>
            </button>
          )}

          <span className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-300">
            Formula
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Main Formula */}
        {data.latexFormula && (
          <div className="rounded-xl border border-white/5 bg-[#0B0F17]/90 p-1">
            <LatexRenderer latex={data.latexFormula} displayMode="block" showCopyButton />
          </div>
        )}

        {/* Live Evaluated Output */}
        {renderedResult && (
          <div className="flex items-center justify-between rounded-lg border border-cyan-500/20 bg-cyan-950/20 p-2.5 text-xs text-cyan-200">
            <span className="flex items-center gap-1 font-semibold text-slate-300">
              <Calculator className="h-3.5 w-3.5 text-cyan-400" />
              Evaluated Value:
            </span>
            <span className="font-mono font-bold text-white text-sm">{renderedResult}</span>
          </div>
        )}

        {/* Dynamic Variable Sliders */}
        {variables.length > 0 && (
          <div className="space-y-2 pt-1 border-t border-white/5">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-1">
                <Sliders className="h-3 w-3 text-indigo-400" />
                Parameters
              </span>
            </div>

            <div className="space-y-2">
              {variables.map((v) => (
                <div key={v.id} className="rounded-lg bg-[#0B0F17]/80 p-2 border border-white/5 space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-indigo-300">${v.symbol}$ ({v.name})</span>
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
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-400"
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
        className="!h-3 !w-3 !rounded-full !border-2 !border-[#0B0F17] !bg-indigo-400 transition-transform hover:!scale-125"
      />
    </div>
  );
};
