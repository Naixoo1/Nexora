'use client';

import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  MessageSquareQuote,
  Mic,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Volume2,
  Languages,
  User,
  Sparkles,
} from 'lucide-react';
import type { StemCanvasNode, DialogueRehearsalData } from '@/types/canvas';
import { MarkdownRenderer } from '@/components/chat/MarkdownRenderer';
import { useCanvasStore } from '@/stores/useCanvasStore';
import { cn } from '@/lib/utils';

export const DialogueRehearsalNode: React.FC<NodeProps<StemCanvasNode>> = ({ id, data, selected }) => {
  const toggleNodeCollapse = useCanvasStore((state) => state.toggleNodeCollapse);
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const openNodeToTaskModal = useCanvasStore((state) => state.openNodeToTaskModal);
  const linkedTasks = useCanvasStore((state) => state.linkedTasks);
  const isLinked = Boolean(linkedTasks[id]);

  const isCollapsed = data.isCollapsed ?? false;
  const rawCustom = (data.customData as Record<string, unknown>) || {};
  const customPayload = (rawCustom.payload || rawCustom) as Partial<DialogueRehearsalData>;

  const characterRole = customPayload.characterRole || 'Peran / Tokoh';
  const dialogueLine = customPayload.dialogueLine || data.title || 'Naskah dialog percakapan...';
  const phoneticOrPronunciationCue = customPayload.phoneticOrPronunciationCue || '';
  const toneOrContextCue = customPayload.toneOrContextCue || '';
  const translationOrMeaning = customPayload.translationOrMeaning || data.content || '';
  const rehearsalCompleted = customPayload.rehearsalCompleted ?? false;

  const toggleRehearsed = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateNodeData(id, {
      customData: {
        type: 'dialogue_rehearsal',
        payload: {
          ...customPayload,
          characterRole,
          dialogueLine,
          phoneticOrPronunciationCue,
          toneOrContextCue,
          translationOrMeaning,
          rehearsalCompleted: !rehearsalCompleted,
        },
      },
    });
  };

  return (
    <div
      className={cn(
        'group relative w-80 sm:w-96 rounded-2xl border transition-all duration-200 shadow-xl backdrop-blur-md',
        'bg-[#131926] text-white border-emerald-500/40 ring-1 ring-emerald-400/20 shadow-[0_0_20px_rgba(16,185,129,0.12)]',
        selected && 'ring-2 ring-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.3)]'
      )}
    >
      {/* Target Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !rounded-full !border-2 !border-[#0B0F17] !bg-emerald-400 transition-transform hover:!scale-125"
      />

      {/* Node Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 bg-[#0B0F17]/60 rounded-t-2xl">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-400 shrink-0">
            <MessageSquareQuote className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
              Dialogue Rehearsal
            </span>
            <h4 className="text-xs font-semibold text-white truncate max-w-[120px]">
              {characterRole}
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
              className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-500/25 transition-colors"
              title="Convert this dialogue cue to a study task"
            >
              <CheckSquare className="h-3 w-3" />
              <span>To Task</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => toggleNodeCollapse(id)}
            className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
            title={isCollapsed ? 'Expand rehearsal details' : 'Collapse rehearsal details'}
          >
            {isCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Node Body */}
      {!isCollapsed && (
        <div className="p-4 space-y-3">
          {/* Character Role & Tone Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-300">
              <User className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>{characterRole}</span>
            </span>

            {toneOrContextCue && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-300 italic">
                <Mic className="h-3 w-3 text-emerald-400 shrink-0" />
                <span>{toneOrContextCue}</span>
              </span>
            )}
          </div>

          {/* Spoken Dialogue Line Callout Card */}
          <div className="rounded-xl border-l-4 border-l-emerald-400 border-y border-r border-white/10 bg-[#0B0F17]/90 p-3 shadow-inner">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 mb-1 flex items-center gap-1">
              <Volume2 className="h-3 w-3" />
              Naskah Ucapan (Spoken Line)
            </div>
            <p className="text-sm font-serif italic text-emerald-100 leading-relaxed">
              &ldquo;{dialogueLine}&rdquo;
            </p>
          </div>

          {/* Phonetic / Pronunciation Cue */}
          {phoneticOrPronunciationCue && (
            <div className="flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/30 px-2.5 py-1.5 text-xs text-cyan-200">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
              <span className="font-mono text-[11px]">{phoneticOrPronunciationCue}</span>
            </div>
          )}

          {/* Translation / Subtext Meaning */}
          {translationOrMeaning && (
            <div className="rounded-xl border border-white/5 bg-[#0B0F17]/80 p-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                <Languages className="h-3 w-3 text-emerald-400" />
                Makna & Konteks Dialog
              </div>
              <div className="text-xs text-slate-300 leading-relaxed font-sans">
                <MarkdownRenderer content={translationOrMeaning} />
              </div>
            </div>
          )}

          {/* Rehearsal Status Checkbox */}
          <button
            type="button"
            onClick={toggleRehearsed}
            className={cn(
              'w-full flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold transition-all border',
              rehearsalCompleted
                ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
            )}
          >
            <CheckCircle2
              className={cn(
                'h-4 w-4 transition-colors',
                rehearsalCompleted ? 'text-emerald-400' : 'text-slate-500'
              )}
            />
            <span>{rehearsalCompleted ? 'Sudah Dilatih / Hafal' : 'Tandai Selesai Latihan'}</span>
          </button>
        </div>
      )}

      {/* Source Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !rounded-full !border-2 !border-[#0B0F17] !bg-emerald-400 transition-transform hover:!scale-125"
      />
    </div>
  );
};
