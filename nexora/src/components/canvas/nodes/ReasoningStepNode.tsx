'use client';

import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Cpu,
  Sparkles,
} from 'lucide-react';
import type { StemCanvasNode, NodeValidationStatus } from '@/types/canvas';
import { LatexRenderer } from '../LatexRenderer';
import { useCanvasStore } from '@/stores/useCanvasStore';
import { cn } from '@/lib/utils';

export const ReasoningStepNode: React.FC<NodeProps<StemCanvasNode>> = ({ id, data, selected }) => {
  const toggleNodeCollapse = useCanvasStore((state) => state.toggleNodeCollapse);

  const isCollapsed = data.isCollapsed ?? false;
  const status: NodeValidationStatus = data.validationStatus || 'tentative';
  const customData = (data.customData as Record<string, unknown>) || {};
  const appliedRule = (customData.appliedRule as string) || '';
  const validationMessage = (customData.validationMessage as string) || '';

  const statusConfig = {
    valid: {
      label: 'Verified Step',
      icon: CheckCircle2,
      border: 'border-emerald-500/60 ring-1 ring-emerald-400/30 shadow-[0_0_20px_rgba(16,185,129,0.18)]',
      pill: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      handle: '!bg-emerald-400',
    },
    tentative: {
      label: 'Tentative Derivation',
      icon: AlertTriangle,
      border: 'border-amber-500/50 ring-1 ring-amber-400/20 shadow-[0_0_15px_rgba(245,158,11,0.12)]',
      pill: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      handle: '!bg-amber-400',
    },
    erroneous: {
      label: 'Derivation Error',
      icon: XCircle,
      border: 'border-rose-500/60 ring-1 ring-rose-500/40 shadow-[0_0_20px_rgba(239,68,68,0.22)]',
      pill: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      handle: '!bg-rose-500',
    },
  }[status];

  const StatusIcon = statusConfig.icon;

  return (
    <div
      className={cn(
        'group relative w-80 sm:w-96 rounded-2xl border transition-all duration-200 shadow-xl backdrop-blur-md',
        'bg-[#131926] text-white',
        statusConfig.border,
        selected && 'ring-2 ring-indigo-400 shadow-[0_0_25px_rgba(99,102,241,0.3)]'
      )}
    >
      {/* Target Handle (Inputs from Root or Previous Step) */}
      <Handle
        type="target"
        position={Position.Top}
        className={cn(
          '!h-3 !w-3 !rounded-full !border-2 !border-[#0B0F17] transition-transform hover:!scale-125',
          statusConfig.handle
        )}
      />

      {/* Node Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 bg-[#0B0F17]/40 rounded-t-2xl">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-400 shrink-0">
            <Cpu className="h-3.5 w-3.5" />
          </div>
          <h4 className="text-xs font-semibold text-white truncate max-w-[150px]">
            {data.title || 'Reasoning Step'}
          </h4>
        </div>

        {/* Status Pill & Collapse Toggle */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
              statusConfig.pill
            )}
          >
            <StatusIcon className="h-3 w-3" />
            <span className="hidden sm:inline">{status}</span>
          </span>

          <button
            type="button"
            onClick={() => toggleNodeCollapse(id)}
            className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
            title={isCollapsed ? 'Expand step details' : 'Collapse step details'}
          >
            {isCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Node Body */}
      {!isCollapsed && (
        <div className="p-4 space-y-3">
          {/* Applied Mathematical Rule Pill */}
          {appliedRule && (
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-xs text-indigo-300">
              <Sparkles className="h-3 w-3 text-indigo-400" />
              <span className="font-semibold">{appliedRule}</span>
            </div>
          )}

          {/* Explanation text */}
          {data.content && (
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {data.content}
            </p>
          )}

          {/* LaTeX Step Formula */}
          {data.latexFormula && (
            <div className="rounded-xl border border-white/5 bg-[#0B0F17]/90 p-1">
              <LatexRenderer latex={data.latexFormula} displayMode="block" showCopyButton />
            </div>
          )}

          {/* Validation Message / AI Feedback */}
          {validationMessage && (
            <div
              className={cn(
                'rounded-lg border p-2 text-xs',
                status === 'valid'
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                  : status === 'erroneous'
                  ? 'border-rose-500/20 bg-rose-500/10 text-rose-300'
                  : 'border-amber-500/20 bg-amber-500/10 text-amber-300'
              )}
            >
              <span className="font-semibold">AI Auditor: </span>
              <span>{validationMessage}</span>
            </div>
          )}
        </div>
      )}

      {/* Source Handle (Outputs to Next Steps or Branches) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className={cn(
          '!h-3 !w-3 !rounded-full !border-2 !border-[#0B0F17] transition-transform hover:!scale-125',
          statusConfig.handle
        )}
      />
    </div>
  );
};
