'use client';

import React, { useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  HelpCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Sparkles,
  Tag,
} from 'lucide-react';
import type { StemCanvasNode, ActiveRecallFlashcardData } from '@/types/canvas';
import { MarkdownRenderer } from '@/components/chat/MarkdownRenderer';
import { useCanvasStore } from '@/stores/useCanvasStore';
import { cn } from '@/lib/utils';

export const FlashcardNode: React.FC<NodeProps<StemCanvasNode>> = ({ id, data, selected }) => {
  const toggleNodeCollapse = useCanvasStore((state) => state.toggleNodeCollapse);
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const openNodeToTaskModal = useCanvasStore((state) => state.openNodeToTaskModal);
  const linkedTasks = useCanvasStore((state) => state.linkedTasks);
  const isLinked = Boolean(linkedTasks[id]);

  const isCollapsed = data.isCollapsed ?? false;
  const rawCustom = (data.customData as Record<string, unknown>) || {};
  const customPayload = (rawCustom.payload || rawCustom) as Partial<ActiveRecallFlashcardData>;

  const question = customPayload.question || data.title || 'Term / Question';
  const answer = customPayload.answer || data.content || 'Hidden concept answer.';
  const topicTag = customPayload.topicTag || '';
  const confidenceScore = customPayload.confidenceScore ?? 0;

  const [isRevealed, setIsRevealed] = useState(false);

  const handleRate = (score: number, e: React.MouseEvent) => {
    e.stopPropagation();
    updateNodeData(id, {
      customData: {
        type: 'active_recall_flashcard',
        payload: {
          ...customPayload,
          question,
          answer,
          topicTag,
          confidenceScore: score,
          lastReviewedAt: new Date().toISOString(),
        },
      },
    });
  };

  const getScoreBadge = () => {
    switch (confidenceScore) {
      case 1:
        return { label: 'Review Again', color: 'bg-rose-500/15 text-rose-400 border-rose-500/30' };
      case 2:
        return { label: 'Hard', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
      case 3:
        return { label: 'Good', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
      case 4:
        return { label: 'Mastered', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' };
      default:
        return { label: 'Unrated', color: 'bg-slate-800 text-slate-400 border-white/5' };
    }
  };

  const scoreBadge = getScoreBadge();

  return (
    <div
      className={cn(
        'group relative w-80 sm:w-96 rounded-2xl border transition-all duration-200 shadow-xl backdrop-blur-md',
        'bg-[#131926] text-white border-cyan-500/40 ring-1 ring-cyan-400/20 shadow-[0_0_20px_rgba(34,211,238,0.12)]',
        selected && 'ring-2 ring-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.3)]'
      )}
    >
      {/* Target Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !rounded-full !border-2 !border-[#0B0F17] !bg-cyan-400 transition-transform hover:!scale-125"
      />

      {/* Node Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 bg-[#0B0F17]/60 rounded-t-2xl">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-cyan-500/15 text-cyan-400 shrink-0">
            <HelpCircle className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block">
              Active Recall Flashcard
            </span>
            <h4 className="text-xs font-semibold text-white truncate max-w-[120px]">
              {data.title || 'Flashcard'}
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
              className="inline-flex items-center gap-1 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-300 hover:bg-cyan-500/25 transition-colors"
              title="Convert this flashcard to a study task"
            >
              <CheckSquare className="h-3 w-3" />
              <span>To Task</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => toggleNodeCollapse(id)}
            className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
            title={isCollapsed ? 'Expand card' : 'Collapse card'}
          >
            {isCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Node Body */}
      {!isCollapsed && (
        <div className="p-4 space-y-3">
          {/* Topic Tag & Score Pill */}
          <div className="flex items-center justify-between gap-2">
            {topicTag ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-300 border border-white/5 truncate max-w-[150px]">
                <Tag className="h-2.5 w-2.5 text-cyan-400 shrink-0" />
                {topicTag}
              </span>
            ) : (
              <span />
            )}
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-wider',
                scoreBadge.color
              )}
            >
              <Sparkles className="h-3 w-3 shrink-0" />
              {scoreBadge.label}
            </span>
          </div>

          {/* Front Prompt / Question */}
          <div className="rounded-xl border border-white/5 bg-[#0B0F17]/80 p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Pertanyaan / Definisi
            </div>
            <div className="text-xs sm:text-sm font-medium text-white leading-relaxed">
              <MarkdownRenderer content={question} />
            </div>
          </div>

          {/* Back Hidden Answer with Toggle */}
          <div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsRevealed(!isRevealed);
              }}
              className={cn(
                'w-full flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold transition-all border',
                isRevealed
                  ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20'
                  : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
              )}
            >
              {isRevealed ? (
                <>
                  <EyeOff className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Sembunyikan Kunci Jawaban</span>
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Buka Kunci Jawaban (Active Recall)</span>
                </>
              )}
            </button>

            {isRevealed && (
              <div className="mt-2 rounded-xl border border-cyan-500/30 bg-gradient-to-b from-cyan-950/20 to-[#0B0F17] p-3 animate-in fade-in-50 duration-200">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400 mb-1">
                  Kunci Penjelasan / Jawaban
                </div>
                <div className="text-xs text-slate-200 leading-relaxed font-sans">
                  <MarkdownRenderer content={answer} />
                </div>
              </div>
            )}
          </div>

          {/* Self-Rating Feedback Buttons */}
          <div className="pt-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 text-center">
              Evaluasi Daya Ingat Mandiri
            </div>
            <div className="grid grid-cols-4 gap-1.5 text-center">
              <button
                type="button"
                onClick={(e) => handleRate(1, e)}
                className={cn(
                  'rounded-lg border px-1.5 py-1 text-[10px] font-semibold transition-all',
                  confidenceScore === 1
                    ? 'border-rose-500 bg-rose-500/30 text-rose-300'
                    : 'border-white/5 bg-white/5 text-rose-400 hover:bg-rose-500/15'
                )}
              >
                Ulangi (1)
              </button>
              <button
                type="button"
                onClick={(e) => handleRate(2, e)}
                className={cn(
                  'rounded-lg border px-1.5 py-1 text-[10px] font-semibold transition-all',
                  confidenceScore === 2
                    ? 'border-amber-500 bg-amber-500/30 text-amber-300'
                    : 'border-white/5 bg-white/5 text-amber-400 hover:bg-amber-500/15'
                )}
              >
                Sulit (2)
              </button>
              <button
                type="button"
                onClick={(e) => handleRate(3, e)}
                className={cn(
                  'rounded-lg border px-1.5 py-1 text-[10px] font-semibold transition-all',
                  confidenceScore === 3
                    ? 'border-emerald-500 bg-emerald-500/30 text-emerald-300'
                    : 'border-white/5 bg-white/5 text-emerald-400 hover:bg-emerald-500/15'
                )}
              >
                Baik (3)
              </button>
              <button
                type="button"
                onClick={(e) => handleRate(4, e)}
                className={cn(
                  'rounded-lg border px-1.5 py-1 text-[10px] font-semibold transition-all',
                  confidenceScore === 4
                    ? 'border-cyan-400 bg-cyan-400/30 text-cyan-200'
                    : 'border-white/5 bg-white/5 text-cyan-400 hover:bg-cyan-500/15'
                )}
              >
                Hafal (4)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Source Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !rounded-full !border-2 !border-[#0B0F17] !bg-cyan-400 transition-transform hover:!scale-125"
      />
    </div>
  );
};
