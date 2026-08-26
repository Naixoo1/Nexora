'use client';

import React, { useEffect, useRef } from 'react';
import {
  Sparkles,
  Phone,
  Zap,
} from 'lucide-react';
import type { ChatMessage } from '@/types/chat';
import { getComplexityConfig } from '@/services/ai-classifier';
import { useChatStore } from '@/stores/useChatStore';
import { useCallModeStore } from '@/stores/useCallModeStore';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { useTranslation } from '@/hooks/useTranslation';
import { ChatMessageItem, RenderMessageContent } from './ChatMessageItem';

export interface ChatMessageListProps {
  messages: ChatMessage[];
  streamingMessage: string | null;
  isSending?: boolean;
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  streamingMessage,
}) => {
  const { useWebLLM, webLLMStatusText } = useChatStore();
  const { startCall } = useCallModeStore();
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);

  const { isPlaying, activeText, speak, stop } = useTextToSpeech();

  // Auto-scroll to bottom on new messages or stream chunks
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingMessage]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-4 space-y-4 pr-2 scroll-smooth"
    >
      {messages.length === 0 && !streamingMessage && (
        <div className="flex h-full flex-col items-center justify-center p-6 text-center text-slate-400">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 text-cyan-300 ring-1 ring-cyan-400/30 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
            <Sparkles className="h-6 w-6" />
          </div>
          <h4 className="mt-3 text-sm font-bold text-white">Nexora AI Multimodal Brainstorming</h4>
          <p className="mt-1 text-xs text-slate-400 max-w-xs leading-relaxed">
            Attach textbook screenshots, PDF problem sets, or dictate questions via voice.
          </p>

          <button
            type="button"
            onClick={() => {
              const currentSession = useChatStore.getState().currentSession;
              startCall(currentSession?.id);
            }}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/50 shadow-lg shadow-cyan-500/10 transition-all hover:scale-105"
          >
            <Phone className="h-3.5 w-3.5" />
            <span>{t('chat.callAI')}</span>
          </button>
        </div>
      )}

      {/* Render Message History */}
      {messages.map((msg) => (
        <ChatMessageItem
          key={msg.id}
          message={msg}
          isPlaying={isPlaying && activeText === msg.content}
          onSpeak={(text) => speak(text)}
          onStopSpeak={stop}
        />
      ))}

      {/* Streaming Assistant Response Buffer */}
      {streamingMessage !== null && (
        <div className="flex gap-2.5 justify-start">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 text-white shadow-md shrink-0 mt-0.5 animate-pulse">
            <Sparkles className="h-3.5 w-3.5" />
          </div>

          <div className="relative max-w-[85%] rounded-2xl rounded-tl-sm bg-[#131926] border border-cyan-500/30 p-3.5 text-slate-200 shadow-xl ring-1 ring-cyan-400/20">
            {streamingMessage ? (
              <RenderMessageContent content={streamingMessage} />
            ) : (
              <div className="flex items-center gap-2 py-1 text-xs">
                {useWebLLM ? (
                  <>
                    <Zap className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                    <span className="font-medium text-amber-300 animate-pulse">
                      {webLLMStatusText || 'Generating on local device GPU...'}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
                    </span>
                    <span className="font-medium text-cyan-300 animate-pulse">
                      {(() => {
                        const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
                        return lastUserMsg
                          ? getComplexityConfig(lastUserMsg.content).statusLabel
                          : 'Synthesizing response...';
                      })()}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
