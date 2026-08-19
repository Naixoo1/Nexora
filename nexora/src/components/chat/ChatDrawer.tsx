'use client';

import React, { useEffect } from 'react';
import {
  Sparkles,
  X,
  Plus,
} from 'lucide-react';
import { useChatStore } from '@/stores/useChatStore';
import { TutorModeSelector } from './TutorModeSelector';
import { ChatMessageList } from './ChatMessageList';
import { ChatInputArea } from './ChatInputArea';
import { cn } from '@/lib/utils';

export const ChatDrawer: React.FC = () => {
  const {
    isDrawerOpen,
    messages,
    streamingMessage,
    isSending,
    currentSession,
    closeDrawer,
    createSession,
  } = useChatStore();

  // Escape key closes drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        closeDrawer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen, closeDrawer]);

  if (!isDrawerOpen) return null;

  const handleNewSession = () => {
    createSession('New Brainstorm');
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden select-none">
      {/* Mobile Backdrop */}
      <div
        className="pointer-events-auto fixed inset-0 bg-black/70 backdrop-blur-sm sm:hidden transition-opacity"
        onClick={closeDrawer}
      />

      {/* Slide-over Drawer Panel */}
      <div
        className={cn(
          'pointer-events-auto fixed right-0 top-0 bottom-0 z-50 flex flex-col',
          'w-full sm:w-[420px] md:w-[460px] lg:w-[480px]',
          'bg-[#0B0F17] border-l border-white/10 shadow-2xl transition-all duration-300 ease-out'
        )}
      >
        {/* Top Header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-[#131926]/90 px-4 backdrop-blur-xl">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 text-white shadow-md shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                {currentSession?.title || 'AI Brainstorming'}
              </h3>
              <p className="text-[10px] text-cyan-400 font-mono">Nexora Tutor</p>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2">
            {/* Tutor Mode Selector */}
            <TutorModeSelector />

            {/* New Chat Button */}
            <button
              type="button"
              onClick={handleNewSession}
              className="rounded-xl border border-white/10 bg-white/5 p-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
              title="Start New Chat Session"
            >
              <Plus className="h-4 w-4" />
            </button>

            {/* Close Drawer Button */}
            <button
              type="button"
              onClick={closeDrawer}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
              title="Close drawer (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Message Stream Area */}
        <ChatMessageList
          messages={messages}
          streamingMessage={streamingMessage}
          isSending={isSending}
        />

        {/* Bottom Input Area */}
        <ChatInputArea />
      </div>
    </div>
  );
};
