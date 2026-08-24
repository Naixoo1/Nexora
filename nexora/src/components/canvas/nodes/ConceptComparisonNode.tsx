'use client';

import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  Scale,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Sparkles,
  ArrowRightLeft,
} from 'lucide-react';
import type { StemCanvasNode, ConceptComparisonData } from '@/types/canvas';
import { MarkdownRenderer } from '@/components/chat/MarkdownRenderer';
import { useCanvasStore } from '@/stores/useCanvasStore';
import { cn } from '@/lib/utils';

export const ConceptComparisonNode: React.FC<NodeProps<StemCanvasNode>> = ({ id, data, selected }) => {
  const toggleNodeCollapse = useCanvasStore((state) => state.toggleNodeCollapse);
  const openNodeToTaskModal = useCanvasStore((state) => state.openNodeToTaskModal);
  const linkedTasks = useCanvasStore((state) => state.linkedTasks);
  const isLinked = Boolean(linkedTasks[id]);

  const isCollapsed = data.isCollapsed ?? false;
  const rawCustom = (data.customData as Record<string, unknown>) || {};
  const customPayload = (rawCustom.payload || rawCustom) as Partial<ConceptComparisonData>;

  const entityA = customPayload.entityA || { name: 'Konsep A', traits: [] };
  const entityB = customPayload.entityB || { name: 'Konsep B', traits: [] };
  const criteriaMatrix = customPayload.criteriaMatrix || [];
  const keyTakeaway = customPayload.keyTakeaway || data.content || '';

  return (
    <div
      className={cn(
        'group relative w-88 sm:w-[420px] rounded-2xl border transition-all duration-200 shadow-xl backdrop-blur-md',
        'bg-[#131926] text-white border-indigo-500/40 ring-1 ring-indigo-400/20 shadow-[0_0_20px_rgba(99,102,241,0.12)]',
        selected && 'ring-2 ring-indigo-400 shadow-[0_0_25px_rgba(99,102,241,0.3)]'
      )}
    >
      {/* Target Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !rounded-full !border-2 !border-[#0B0F17] !bg-indigo-400 transition-transform hover:!scale-125"
      />

      {/* Node Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 bg-[#0B0F17]/60 rounded-t-2xl">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/15 text-indigo-400 shrink-0">
            <Scale className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block">
              Concept Comparison
            </span>
            <h4 className="text-xs font-semibold text-white truncate max-w-[140px]">
              {data.title || `${entityA.name} vs ${entityB.name}`}
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
              className="inline-flex items-center gap-1 rounded-md border border-indigo-500/30 bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-300 hover:bg-indigo-500/25 transition-colors"
              title="Convert comparison matrix to a study task"
            >
              <CheckSquare className="h-3 w-3" />
              <span>To Task</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => toggleNodeCollapse(id)}
            className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
            title={isCollapsed ? 'Expand comparison details' : 'Collapse comparison details'}
          >
            {isCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Node Body */}
      {!isCollapsed && (
        <div className="p-4 space-y-3">
          {/* Dual Column Side-by-Side View */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Entity A */}
            <div className="rounded-xl border border-sky-500/25 bg-sky-950/20 p-2.5 space-y-1.5">
              <div className="text-xs font-bold text-sky-300 border-b border-sky-500/20 pb-1 flex items-center justify-between">
                <span className="truncate">{entityA.name}</span>
                <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-sky-500/20 text-sky-200">A</span>
              </div>
              {entityA.summary && (
                <div className="text-[11px] text-slate-300 leading-snug">
                  <MarkdownRenderer content={entityA.summary} />
                </div>
              )}
              {entityA.traits && entityA.traits.length > 0 && (
                <ul className="text-[10px] text-slate-300 space-y-1 pl-3 list-disc">
                  {entityA.traits.map((trait, idx) => (
                    <li key={idx}>{trait}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Entity B */}
            <div className="rounded-xl border border-purple-500/25 bg-purple-950/20 p-2.5 space-y-1.5">
              <div className="text-xs font-bold text-purple-300 border-b border-purple-500/20 pb-1 flex items-center justify-between">
                <span className="truncate">{entityB.name}</span>
                <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-purple-500/20 text-purple-200">B</span>
              </div>
              {entityB.summary && (
                <div className="text-[11px] text-slate-300 leading-snug">
                  <MarkdownRenderer content={entityB.summary} />
                </div>
              )}
              {entityB.traits && entityB.traits.length > 0 && (
                <ul className="text-[10px] text-slate-300 space-y-1 pl-3 list-disc">
                  {entityB.traits.map((trait, idx) => (
                    <li key={idx}>{trait}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Criteria Matrix Table */}
          {criteriaMatrix.length > 0 && (
            <div className="rounded-xl border border-white/5 bg-[#0B0F17]/90 p-2 overflow-x-auto">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                <ArrowRightLeft className="h-3 w-3 text-indigo-400" />
                Matriks Parameter Pembanding
              </div>
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400">
                    <th className="pb-1 font-medium">Kriteria</th>
                    <th className="pb-1 font-medium text-sky-300">{entityA.name}</th>
                    <th className="pb-1 font-medium text-purple-300">{entityB.name}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {criteriaMatrix.map((row, idx) => (
                    <tr key={idx} className="hover:bg-white/5">
                      <td className="py-1 font-medium text-slate-400">{row.criterion}</td>
                      <td className="py-1 pr-2">{row.entityAValue}</td>
                      <td className="py-1">{row.entityBValue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Key Takeaway / Conclusion */}
          {keyTakeaway && (
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400 mb-1 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-indigo-400" />
                Kesimpulan Komparatif
              </div>
              <div className="text-xs text-slate-300 leading-relaxed font-sans">
                <MarkdownRenderer content={keyTakeaway} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Source Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !rounded-full !border-2 !border-[#0B0F17] !bg-indigo-400 transition-transform hover:!scale-125"
      />
    </div>
  );
};
