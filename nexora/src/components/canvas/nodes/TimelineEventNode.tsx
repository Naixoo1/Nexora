'use client';

import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  History,
  Calendar,
  Users,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Milestone,
  Flag,
} from 'lucide-react';
import type { StemCanvasNode, TimelineEventData } from '@/types/canvas';
import { MarkdownRenderer } from '@/components/chat/MarkdownRenderer';
import { useCanvasStore } from '@/stores/useCanvasStore';
import { cn } from '@/lib/utils';

export const TimelineEventNode: React.FC<NodeProps<StemCanvasNode>> = ({ id, data, selected }) => {
  const toggleNodeCollapse = useCanvasStore((state) => state.toggleNodeCollapse);
  const openNodeToTaskModal = useCanvasStore((state) => state.openNodeToTaskModal);
  const linkedTasks = useCanvasStore((state) => state.linkedTasks);
  const isLinked = Boolean(linkedTasks[id]);

  const isCollapsed = data.isCollapsed ?? false;
  const rawCustom = (data.customData as Record<string, unknown>) || {};
  const customPayload = (rawCustom.payload || rawCustom) as Partial<TimelineEventData>;

  const dateOrPeriod = customPayload.dateOrPeriod || 'Period / Date';
  const eventTitle = customPayload.eventTitle || data.title || 'Historical Milestone Event';
  const causeOrSignificance = customPayload.causeOrSignificance || data.content || '';
  const keyFigures = customPayload.keyFigures || [];
  const eraTag = customPayload.eraTag || '';

  return (
    <div
      className={cn(
        'group relative w-80 sm:w-96 rounded-2xl border transition-all duration-200 shadow-xl backdrop-blur-md',
        'bg-[#131926] text-white border-amber-500/40 ring-1 ring-amber-400/20 shadow-[0_0_20px_rgba(245,158,11,0.12)]',
        selected && 'ring-2 ring-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.3)]'
      )}
    >
      {/* Target Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !rounded-full !border-2 !border-[#0B0F17] !bg-amber-400 transition-transform hover:!scale-125"
      />

      {/* Node Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 bg-[#0B0F17]/60 rounded-t-2xl">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/15 text-amber-400 shrink-0">
            <History className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
              Timeline Event
            </span>
            <h4 className="text-xs font-semibold text-white truncate max-w-[120px]">
              {eventTitle}
            </h4>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isLinked ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              Linked
            </span>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openNodeToTaskModal(id);
              }}
              className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300 hover:bg-amber-500/25 transition-colors"
              title="Convert this historical event to a study task"
            >
              <CheckSquare className="h-3 w-3" />
              <span>To Task</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => toggleNodeCollapse(id)}
            className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
            title={isCollapsed ? 'Expand event details' : 'Collapse event details'}
          >
            {isCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Node Body */}
      {!isCollapsed && (
        <div className="p-4 space-y-3">
          {/* Chronological Date & Era Pill */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-300 shadow-sm">
              <Calendar className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>{dateOrPeriod}</span>
            </span>

            {eraTag && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                <Milestone className="h-3 w-3 text-amber-400 shrink-0" />
                <span>{eraTag}</span>
              </span>
            )}
          </div>

          {/* Event Title */}
          <div className="text-sm font-bold text-white tracking-tight flex items-start gap-1.5">
            <Flag className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <span>{eventTitle}</span>
          </div>

          {/* Cause & Significance */}
          {causeOrSignificance && (
            <div className="rounded-xl border border-white/5 bg-[#0B0F17]/80 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Latar Belakang, Proses & Signifikansi
              </div>
              <div className="text-xs text-slate-300 leading-relaxed font-sans">
                <MarkdownRenderer content={causeOrSignificance} />
              </div>
            </div>
          )}

          {/* Key Figures */}
          {keyFigures.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                <Users className="h-3 w-3 text-amber-400" />
                Tokoh Kunci Terlibat
              </div>
              <div className="flex flex-wrap gap-1.5">
                {keyFigures.map((figure, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center rounded-md bg-amber-950/40 border border-amber-500/20 px-2 py-0.5 text-[11px] font-medium text-amber-200"
                  >
                    {figure}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Source Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !rounded-full !border-2 !border-[#0B0F17] !bg-amber-400 transition-transform hover:!scale-125"
      />
    </div>
  );
};
