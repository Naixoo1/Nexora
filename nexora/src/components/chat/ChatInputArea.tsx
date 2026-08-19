'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  CheckSquare,
  Cpu,
  X,
  Loader2,
} from 'lucide-react';
import { useChatStore } from '@/stores/useChatStore';
import type { AcademicTutorMode } from '@/types/chat';
import { cn } from '@/lib/utils';

const PROMPT_STARTERS: Record<AcademicTutorMode, string[]> = {
  socratic: [
    '💡 What conceptual step should I verify first?',
    '🔍 Does my current solution hold under all boundary conditions?',
    '❓ Give me a guiding hint without revealing the final answer.',
  ],
  olympiad: [
    '🏆 Is there an invariant or monovariant in this system?',
    '📐 Suggest a rigorous extremal principle or proof technique.',
    '⚡ Can we generalize this result to n dimensions?',
  ],
  step_breakdown: [
    '🔢 Provide a complete step-by-step mathematical expansion.',
    '✍️ Verify if this derivation step has algebraic errors.',
    '📐 Show the intermediate integral substitution.',
  ],
  thesis_mentor: [
    '📚 Help me articulate the research gap in this methodology.',
    '📊 Structure the empirical validation section for Chapter 3.',
    '🔍 Suggest relevant academic citations and theoretical frameworks.',
  ],
};

export const ChatInputArea: React.FC = () => {
  const {
    activeTutorMode,
    taskContext,
    canvasContext,
    isSending,
    sendMessage,
    setTaskContext,
    setCanvasContext,
  } = useChatStore();

  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;

    sendMessage(input.trim());
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleApplyStarter = (starter: string) => {
    sendMessage(starter);
  };

  const starters = PROMPT_STARTERS[activeTutorMode] || PROMPT_STARTERS.socratic;

  return (
    <div className="border-t border-white/10 bg-[#131926]/90 p-3.5 space-y-2.5 backdrop-blur-xl">
      {/* Active Workspace Context Chips */}
      {(taskContext || canvasContext) && (
        <div className="flex flex-wrap items-center gap-1.5 pb-1">
          {taskContext && (
            <div className="flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[11px] text-indigo-300">
              <CheckSquare className="h-3 w-3 text-indigo-400 shrink-0" />
              <span className="truncate max-w-[140px]">Task: {taskContext.title}</span>
              <button
                type="button"
                onClick={() => setTaskContext(undefined)}
                className="rounded text-slate-400 hover:text-white"
                title="Detach task context"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          )}

          {canvasContext && (
            <div className="flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[11px] text-cyan-300">
              <Cpu className="h-3 w-3 text-cyan-400 shrink-0" />
              <span className="truncate max-w-[140px]">
                {canvasContext.selectedNodeTitle
                  ? `Node: ${canvasContext.selectedNodeTitle}`
                  : `Canvas: ${canvasContext.canvasTitle}`}
              </span>
              <button
                type="button"
                onClick={() => setCanvasContext(undefined)}
                className="rounded text-slate-400 hover:text-white"
                title="Detach canvas context"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Quick Prompt Starter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
        {starters.slice(0, 2).map((starter, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleApplyStarter(starter)}
            disabled={isSending}
            className="shrink-0 rounded-full border border-white/5 bg-[#0B0F17] px-2.5 py-1 text-slate-400 hover:border-cyan-500/30 hover:bg-cyan-500/10 hover:text-cyan-300 transition-all text-left truncate max-w-[200px]"
          >
            {starter}
          </button>
        ))}
      </div>

      {/* Main Input Form */}
      <form onSubmit={handleSubmit} className="relative flex items-end gap-2">
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Nexora AI or brainstorm next steps..."
          disabled={isSending}
          className="w-full resize-none rounded-xl border border-white/10 bg-[#0B0F17] px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/30 max-h-32 disabled:opacity-50"
        />

        <button
          type="submit"
          disabled={!input.trim() || isSending}
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-lg transition-all',
            input.trim() && !isSending
              ? 'hover:opacity-95 active:scale-95'
              : 'opacity-40 cursor-not-allowed'
          )}
          title="Send prompt (Enter)"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin text-white" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </form>
    </div>
  );
};
