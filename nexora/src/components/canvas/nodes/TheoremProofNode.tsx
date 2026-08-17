'use client';

import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { CheckSquare, BookOpen, Award } from 'lucide-react';
import type { StemCanvasNode } from '@/types/canvas';
import { LatexRenderer } from '../LatexRenderer';
import { cn } from '@/lib/utils';

export const TheoremProofNode: React.FC<NodeProps<StemCanvasNode>> = ({ data, selected }) => {
  const customData = (data.customData as Record<string, unknown>) || {};
  const theoremName = (customData.theoremName as string) || data.title || 'Mathematical Theorem';
  const applicabilityConditions =
    (customData.applicabilityConditions as string[]) || [
      'Function f is continuous on closed interval [a, b]',
      'Function f is differentiable on open interval (a, b)',
    ];
  const sourceReference =
    (customData.sourceReference as string) || (data.content ? '' : 'Stewart Calculus, 8th Ed.');

  return (
    <div
      className={cn(
        'group relative w-80 sm:w-96 rounded-2xl border transition-all duration-200 shadow-2xl backdrop-blur-md',
        'bg-[#131926] text-white',
        'border-amber-500/40 hover:border-amber-400',
        selected
          ? 'ring-2 ring-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.25)]'
          : 'shadow-[0_0_15px_rgba(245,158,11,0.08)]'
      )}
    >
      {/* Target Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !rounded-full !border-2 !border-[#0B0F17] !bg-amber-400 transition-transform hover:!scale-125"
      />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-amber-950/40 via-indigo-950/20 to-transparent px-4 py-2.5 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-bold shadow-md">
            <Award className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
              Theorem / Axiom
            </span>
            <h4 className="text-xs font-semibold text-white truncate max-w-[180px]">
              {theoremName}
            </h4>
          </div>
        </div>

        <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
          Formal Proof
        </span>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Theorem Formula Statement */}
        {data.latexFormula && (
          <div className="rounded-xl border border-amber-500/20 bg-[#0B0F17]/90 p-1">
            <LatexRenderer latex={data.latexFormula} displayMode="block" showCopyButton />
          </div>
        )}

        {/* Content explanation */}
        {data.content && (
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            {data.content}
          </p>
        )}

        {/* Applicability Conditions Checklist */}
        {applicabilityConditions.length > 0 && (
          <div className="space-y-1.5 rounded-xl border border-white/5 bg-[#0B0F17]/50 p-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <CheckSquare className="h-3 w-3 text-amber-400" />
              Applicability Conditions
            </div>
            <ul className="space-y-1 text-xs text-slate-300">
              {applicabilityConditions.map((cond, idx) => (
                <li key={idx} className="flex items-start gap-1.5 text-[11px]">
                  <span className="text-amber-400 font-bold">✓</span>
                  <span>{cond}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Source citation */}
        {sourceReference && (
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 pt-1">
            <BookOpen className="h-3 w-3 text-indigo-400" />
            <span className="italic truncate">{sourceReference}</span>
          </div>
        )}
      </div>

      {/* Source Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !rounded-full !border-2 !border-[#0B0F17] !bg-amber-400 transition-transform hover:!scale-125"
      />
    </div>
  );
};
