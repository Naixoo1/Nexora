'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import { useChatStore } from '@/stores/useChatStore';
import { cn } from '@/lib/utils';

export interface FloatingBrainstormButtonProps {
  className?: string;
  onClickCustom?: () => void;
}

export const FloatingBrainstormButton: React.FC<FloatingBrainstormButtonProps> = ({
  className,
  onClickCustom,
}) => {
  const { isDrawerOpen, openDrawer, taskContext, canvasContext } = useChatStore();

  if (isDrawerOpen) return null;

  const handleClick = () => {
    if (onClickCustom) {
      onClickCustom();
    } else {
      openDrawer();
    }
  };

  const hasContext = Boolean(taskContext || canvasContext);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'group fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-2xl p-3 sm:px-4 sm:py-3 shadow-2xl transition-all duration-300',
        'bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400 text-white',
        'hover:scale-105 hover:shadow-[0_0_25px_rgba(6,182,212,0.4)] active:scale-95',
        className
      )}
      title="Open AI Brainstorming & Tutor Drawer"
    >
      <div className="relative">
        <Sparkles className="h-5 w-5 animate-pulse text-white" />
        {hasContext && (
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-200 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
        )}
      </div>

      <span className="hidden sm:inline text-xs sm:text-sm font-bold tracking-tight">
        AI Brainstorm
      </span>

      {hasContext && (
        <span className="hidden md:inline-flex rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-mono">
          Context Linked
        </span>
      )}
    </button>
  );
};
