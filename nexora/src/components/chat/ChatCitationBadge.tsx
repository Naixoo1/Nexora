'use client';

import React from 'react';
import { Cpu, CheckSquare, Binary, FileText, ExternalLink } from 'lucide-react';
import type { ChatSourceCitation } from '@/types/chat';
import { useCanvasStore } from '@/stores/useCanvasStore';
import { useTaskStore } from '@/stores/useTaskStore';
import { cn } from '@/lib/utils';

export interface ChatCitationBadgeProps {
  citation: ChatSourceCitation;
  className?: string;
}

export const ChatCitationBadge: React.FC<ChatCitationBadgeProps> = ({
  citation,
  className,
}) => {
  const selectNode = useCanvasStore((state) => state.selectNode);
  const openCreateModal = useTaskStore((state) => state.openCreateModal);
  const tasks = useTaskStore((state) => state.tasks);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (citation.sourceType === 'canvas_node') {
      selectNode(citation.referenceId);
    } else if (citation.sourceType === 'task') {
      const foundTask = tasks.find((t) => t.id === citation.referenceId);
      if (foundTask) {
        openCreateModal(true, foundTask.parentId, foundTask);
      }
    }
  };

  const iconConfig = {
    canvas_node: {
      icon: Cpu,
      color: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400',
    },
    task: {
      icon: CheckSquare,
      color: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 hover:border-indigo-400',
    },
    formula: {
      icon: Binary,
      color: 'border-sky-500/40 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 hover:border-sky-400',
    },
    document_chunk: {
      icon: FileText,
      color: 'border-purple-500/40 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 hover:border-purple-400',
    },
  }[citation.sourceType];

  const Icon = iconConfig.icon;

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-xs font-mono transition-all shadow-sm active:scale-95 cursor-pointer align-baseline my-0.5',
        iconConfig.color,
        className
      )}
      title={citation.snippet || `Navigate to ${citation.label}`}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span className="truncate max-w-[160px]">{citation.label}</span>
      <ExternalLink className="h-2.5 w-2.5 opacity-60" />
    </button>
  );
};
