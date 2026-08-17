'use client';

import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Binary, Sliders, Calculator, Sparkles } from 'lucide-react';
import type { StemCanvasNode } from '@/types/canvas';
import { LatexRenderer } from '../LatexRenderer';
import { useCanvasStore } from '@/stores/useCanvasStore';
import { cn } from '@/lib/utils';

export const FormulaBlockNode: React.FC<NodeProps<StemCanvasNode>> = ({ id, data, selected }) => {
  const updateVariable = useCanvasStore((state) => state.updateVariable);
  const globalVariables = useCanvasStore((state) => state.globalVariables);

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
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md">
            <Binary className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
              Formula Block
            </span>
            <h4 className="text-xs font-semibold text-white truncate max-w-[180px]">
              {data.title || 'Mathematical Expression'}
            </h4>
          </div>
        </div>

        <span className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-300">
          Interactive
        </span>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Main Formula */}
        {data.latexFormula ? (
          <div className="rounded-xl border border-indigo-500/20 bg-[#0B0F17]/90 p-1">
            <LatexRenderer latex={data.latexFormula} displayMode="block" showCopyButton />
          </div>
        ) : (
          <div className="text-xs text-slate-500 italic p-2 text-center">
            No formula defined.
          </div>
        )}

        {/* Evaluated Result Preview if available */}
        {renderedResult && (
          <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300">
            <span className="flex items-center gap-1 font-semibold">
              <Calculator className="h-3.5 w-3.5" />
              Evaluated:
            </span>
            <span className="font-mono font-bold text-white">{renderedResult}</span>
          </div>
        )}

        {/* Attached Variables Sliders */}
        {variables.length > 0 && (
          <div className="space-y-2 rounded-xl border border-white/5 bg-[#0B0F17]/50 p-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Sliders className="h-3 w-3 text-indigo-400" />
              Active Parameters
            </div>
            {variables.map((v) => {
              const matchingGlobal = globalVariables.find((gv) => gv.id === v.id);
              const currentValue = matchingGlobal ? matchingGlobal.value : v.value;

              return (
                <div key={v.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-300">{v.name}:</span>
                    <span className="font-bold text-cyan-300">{currentValue} {v.unit || ''}</span>
                  </div>
                  <input
                    type="range"
                    min={v.min || 0}
                    max={v.max || 100}
                    step={v.step || 1}
                    value={currentValue}
                    onChange={(e) => updateVariable(v.id, parseFloat(e.target.value))}
                    className="w-full h-1.5 rounded-lg bg-slate-800 accent-indigo-400 cursor-pointer"
                  />
                </div>
              );
            })}
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
