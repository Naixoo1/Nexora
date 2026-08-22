'use client';

import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Target, Sparkles, Sliders, CheckSquare, CheckCircle2 } from 'lucide-react';
import type { StemCanvasNode } from '@/types/canvas';
import { LatexRenderer } from '../LatexRenderer';
import { MarkdownRenderer } from '@/components/chat/MarkdownRenderer';
import { useCanvasStore } from '@/stores/useCanvasStore';
import { cn } from '@/lib/utils';

export const ProblemRootNode: React.FC<NodeProps<StemCanvasNode>> = ({ id, data, selected }) => {
  const openNodeToTaskModal = useCanvasStore((state) => state.openNodeToTaskModal);
  const linkedTasks = useCanvasStore((state) => state.linkedTasks);
  const isLinked = Boolean(linkedTasks[id]);

  const customData = (data.customData as Record<string, unknown>) || {};
  const domain = (customData.domain as string) || 'Calculus & Physics';
  const targetGoal = (customData.targetGoal as string) || (data.content ? '' : 'Solve & prove equation');
  const statement = (customData.statement as string) || data.content || '';
  const variables = data.variables || [];

  return (
    <div
      className={cn(
        'group relative w-80 sm:w-96 rounded-2xl border transition-all duration-200 shadow-2xl backdrop-blur-md',
        'bg-[#131926] text-white',
        selected
          ? 'border-cyan-400 ring-2 ring-cyan-400/30 shadow-[0_0_25px_rgba(6,182,212,0.25)]'
          : 'border-white/10 hover:border-indigo-500/50'
      )}
    >
      {/* Node Header Banner */}
      <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-indigo-900/40 via-cyan-950/30 to-transparent px-4 py-2.5 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 text-white shadow-md">
            <Target className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
              Problem Root
            </span>
            <h4 className="text-xs font-semibold text-white truncate max-w-[150px]">
              {data.title || 'Initial Problem'}
            </h4>
          </div>
        </div>

        {/* Right Badges & Actions */}
        <div className="flex items-center gap-1.5">
          {isLinked ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
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
              className="inline-flex items-center gap-1 rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-300 hover:bg-indigo-500/25 hover:border-indigo-400 transition-colors"
              title="Convert this problem to a tracked task"
            >
              <CheckSquare className="h-3 w-3" />
              <span>To Task</span>
            </button>
          )}

          <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium text-cyan-300">
            {domain}
          </span>
        </div>
      </div>

      {/* Node Body */}
      <div className="p-4 space-y-3">
        {/* Problem Statement */}
        {statement && (
          <div className="text-xs text-slate-300 leading-relaxed font-sans line-clamp-4">
            <MarkdownRenderer content={statement} />
          </div>
        )}

        {/* Primary Formula Preview */}
        {data.latexFormula && (
          <div className="rounded-xl border border-white/5 bg-[#0B0F17]/90 p-1">
            <LatexRenderer latex={data.latexFormula} displayMode="block" showCopyButton />
          </div>
        )}

        {/* Target Goal */}
        {targetGoal && (
          <div className="flex items-start gap-1.5 rounded-lg border border-indigo-500/20 bg-indigo-500/10 p-2 text-xs text-indigo-300">
            <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5 text-indigo-400" />
            <div className="min-w-0">
              <span className="font-semibold text-white">Target Goal: </span>
              <MarkdownRenderer content={targetGoal} className="inline" />
            </div>
          </div>
        )}

        {/* Given Variables Tags */}
        {variables.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-1">
                <Sliders className="h-3 w-3 text-cyan-400" />
                Given Variables
              </span>
              <span>{variables.length} parameters</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {variables.map((v) => (
                <span
                  key={v.id}
                  className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-[#0B0F17] px-2 py-0.5 text-[11px] font-mono text-cyan-300"
                >
                  <span className="text-slate-400">{v.name}:</span>
                  <span className="font-bold text-white">{v.value}</span>
                  {v.unit && <span className="text-[10px] text-slate-500">{v.unit}</span>}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Source Connection Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !rounded-full !border-2 !border-[#0B0F17] !bg-cyan-400 transition-transform hover:!scale-125 hover:!bg-indigo-400"
      />
    </div>
  );
};
