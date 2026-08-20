'use client';

import React, { useEffect } from 'react';
import {
  Sparkles,
  X,
  Plus,
  Maximize2,
  Minimize2,
  History,
} from 'lucide-react';
import { useChatStore } from '@/stores/useChatStore';
import { TutorModeSelector } from './TutorModeSelector';
import { ChatMessageList } from './ChatMessageList';
import { ChatInputArea } from './ChatInputArea';
import { ChatHistoryPanel } from './ChatHistoryPanel';
import { cn } from '@/lib/utils';

export const ChatDrawer: React.FC = () => {
  const {
    isDrawerOpen,
    isExpanded,
    isHistoryOpen,
    messages,
    streamingMessage,
    isSending,
    currentSession,
    closeDrawer,
    toggleExpanded,
    toggleHistory,
    startNewChat,
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

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden select-none">
      {/* Mobile Backdrop (when drawer is open in normal mode) */}
      {!isExpanded && (
        <div
          className="pointer-events-auto fixed inset-0 bg-black/70 backdrop-blur-sm sm:hidden transition-opacity"
          onClick={closeDrawer}
        />
      )}

      {/* Main Drawer / Fullscreen Container */}
      <div
        className={cn(
          'pointer-events-auto z-50 flex flex-col bg-[#0B0F17] shadow-2xl transition-all duration-300 ease-out',
          isExpanded
            ? 'fixed inset-0 w-full h-full'
            : 'fixed right-0 top-0 bottom-0 w-full sm:w-[460px] md:w-[520px] lg:w-[560px] border-l border-white/10'
        )}
      >
        {/* Top Header Bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-[#131926]/95 px-3.5 sm:px-4 backdrop-blur-xl z-20">
          <div className="flex items-center gap-2 min-w-0">
            {/* History Panel Toggle Button */}
            <button
              type="button"
              onClick={toggleHistory}
              className={cn(
                'rounded-xl border p-1.5 transition-colors',
                isHistoryOpen
                  ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
              )}
              title="Chat History & Sessions"
            >
              <History className="h-4 w-4" />
            </button>

            {/* AI Avatar Sparkle */}
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 text-white shadow-md shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>

            {/* Session Title & Active Tutor Status */}
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-white truncate max-w-[130px] sm:max-w-[200px] md:max-w-[280px]">
                {currentSession?.title || 'AI Brainstorming'}
              </h3>
              <p className="text-[10px] text-cyan-400 font-mono">Nexora Academic Tutor</p>
            </div>
          </div>

          {/* Right Header Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Tutor Mode Selector */}
            <TutorModeSelector />

            {/* New Chat Button */}
            <button
              type="button"
              onClick={() => startNewChat()}
              className="rounded-xl border border-white/10 bg-white/5 p-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
              title="Start New Chat Session (+)"
            >
              <Plus className="h-4 w-4" />
            </button>

            {/* Full-Screen / Expand View Toggle */}
            <button
              type="button"
              onClick={toggleExpanded}
              className={cn(
                'rounded-xl border p-1.5 transition-colors hidden sm:flex items-center justify-center',
                isExpanded
                  ? 'border-cyan-500/40 bg-cyan-500/20 text-cyan-300'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
              )}
              title={isExpanded ? 'Collapse to Drawer view' : 'Expand to Full-Screen view'}
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
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

        {/* Content Body Layout: History Sidebar + Main Chat Conversation Pane */}
        <div className="relative flex flex-1 overflow-hidden">
          {/* History Sidebar Panel */}
          {isHistoryOpen && (
            <div className="shrink-0 z-30 h-full border-r border-white/10">
              <ChatHistoryPanel />
            </div>
          )}

          {/* Chat Stream Area & Input Container */}
          <div className="flex flex-1 flex-col overflow-hidden bg-[#0B0F17]">
            <div className={cn('flex flex-1 flex-col overflow-hidden w-full', isExpanded && 'max-w-4xl mx-auto')}>
              {/* Message List */}
              <ChatMessageList
                messages={messages}
                streamingMessage={streamingMessage}
                isSending={isSending}
              />

              {/* Bottom Input Area */}
              <ChatInputArea />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
