'use client';

import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { GitFork, Sliders, TrendingUp, Sparkles, HelpCircle } from 'lucide-react';
import type { StemCanvasNode, WhatIfBranchData, CanvasVariable } from '@/types/canvas';
import { LatexRenderer } from '../LatexRenderer';
import { useCanvasStore } from '@/stores/useCanvasStore';
import { cn } from '@/lib/utils';

export const WhatIfBranchNode: React.FC<NodeProps<StemCanvasNode>> = ({ id, data, selected }) => {
  const updateVariable = useCanvasStore((state) => state.updateVariable);
  const globalVariables = useCanvasStore((state) => state.globalVariables);

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
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-indigo-500 text-white shadow-md">
            <GitFork className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
              What-If Simulation
            </span>
            <h4 className="text-xs font-semibold text-white truncate max-w-[170px]">
              {hypothesis}
            </h4>
          </div>
        </div>

        {/* Sensitivity Badge */}
        <span className="inline-flex items-center gap-1 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-mono text-cyan-300">
          <TrendingUp className="h-3 w-3" />
          {Math.round(sensitivityScore * 100)}% Sens.
        </span>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3.5">
        {/* Hypothesis Narrative */}
        <p className="text-xs text-slate-300 leading-relaxed font-sans">
          {outcomeComparison}
        </p>

        {/* Simulated Formula */}
        {data.latexFormula && (
          <div className="rounded-xl border border-cyan-500/20 bg-[#0B0F17]/90 p-1">
            <LatexRenderer latex={data.latexFormula} displayMode="block" showCopyButton />
          </div>
        )}

        {/* Live Variable Delta Sliders */}
        {variables.length > 0 ? (
          <div className="space-y-2 rounded-xl border border-white/5 bg-[#0B0F17]/60 p-3">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-1">
                <Sliders className="h-3 w-3 text-cyan-400" />
                Parameter Delta Sliders
              </span>
              <span>Live Updates</span>
            </div>

            {variables.map((v) => {
              // Find matching global value if present
              const matchingGlobal = globalVariables.find((gv) => gv.id === v.id);
              const currentValue = matchingGlobal ? matchingGlobal.value : v.value;

              return (
                <div key={v.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-300 flex items-center gap-1">
                      <span className="font-semibold text-cyan-400">{v.name}</span>
                      {v.unit && <span className="text-[10px] text-slate-500">({v.unit})</span>}
                    </span>
                    <span className="font-bold text-white bg-white/5 px-1.5 py-0.5 rounded text-[11px]">
                      {currentValue}
                    </span>
                  </div>

                  <input
                    type="range"
                    min={v.min || 0}
                    max={v.max || 100}
                    step={v.step || 1}
                    value={currentValue}
                    onChange={(e) => updateVariable(v.id, parseFloat(e.target.value))}
                    className="w-full h-1.5 rounded-lg bg-slate-800 accent-cyan-400 cursor-pointer"
                  />

                  <div className="flex justify-between text-[9px] font-mono text-slate-500">
                    <span>min: {v.min || 0}</span>
                    <span>max: {v.max || 100}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <HelpCircle className="h-3.5 w-3.5 text-cyan-400" />
            <span>Connect to global variables via the Variable Sidebar.</span>
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
