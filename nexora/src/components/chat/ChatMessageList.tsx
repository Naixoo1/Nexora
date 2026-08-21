'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  User,
  Copy,
  Check,
  FileText,
  FileCode,
  Image as ImageIcon,
  Network,
  CheckCircle2,
} from 'lucide-react';
import type { ChatMessage, ChatSourceCitation } from '@/types/chat';
import { LatexRenderer } from '../canvas/LatexRenderer';
import { ChatCitationBadge } from './ChatCitationBadge';
import { MarkdownRenderer } from './MarkdownRenderer';
import { getComplexityConfig } from '@/services/ai-classifier';
import { cn } from '@/lib/utils';

export interface ChatMessageListProps {
  messages: ChatMessage[];
  streamingMessage: string | null;
  isSending?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface NexoraNodePayload {
  title?: string;
  type?: string;
  nodeType?: string;
  latex?: string;
  latexFormula?: string;
  content?: string;
  description?: string;
  status?: string;
  validationStatus?: string;
}

const NexoraNodePreviewCard: React.FC<{ rawJson: string }> = ({ rawJson }) => {
  try {
    const data: NexoraNodePayload = JSON.parse(rawJson.trim());
    const title = data.title || 'Derived STEM Node';
    const latex = data.latexFormula || data.latex || '';
    const desc = data.content || data.description || '';
    const rawType = data.type || data.nodeType || 'reasoning_step';

    return (
      <div className="my-3 overflow-hidden rounded-2xl border border-cyan-500/30 bg-[#0B0F17]/95 p-3.5 shadow-xl ring-1 ring-cyan-400/20 backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400">
              <Network className="h-3.5 w-3.5" />
            </div>
            <div>
              <span className="text-xs font-bold text-white">{title}</span>
              <span className="ml-2 text-[10px] uppercase tracking-wider text-slate-400 font-mono">
                {rawType.replace('_', ' ')}
              </span>
            </div>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium text-cyan-300 border border-cyan-500/20">
            <CheckCircle2 className="h-3 w-3 text-cyan-400" />
            Synced to Canvas
          </span>
        </div>

        {latex && (
          <div className="my-2.5 rounded-xl border border-white/5 bg-[#131926] p-2.5 text-center">
            <LatexRenderer latex={latex} displayMode="block" showCopyButton />
          </div>
        )}

        {desc && (
          <p className="text-[11px] text-slate-300 leading-relaxed font-sans mt-1">
            {desc}
          </p>
        )}
      </div>
    );
  } catch {
    return (
      <pre className="my-2 rounded-xl bg-slate-900 p-2 font-mono text-[11px] text-slate-400 overflow-x-auto">
        {rawJson}
      </pre>
    );
  }
};

/**
 * Parses message text containing mixed markdown, nexora-node blocks, and LaTeX math
 */
const RenderMessageContent: React.FC<{ content: string; citations?: ChatSourceCitation[] }> = ({
  content,
}) => {
  // First, parse out ```nexora-node ... ``` blocks
  const nexoraNodeRegex = /```nexora-node\s*([\s\S]*?)\s*```/g;
  const sections: React.ReactNode[] = [];
  let lastSecIndex = 0;
  let nodeMatch: RegExpExecArray | null;

  while ((nodeMatch = nexoraNodeRegex.exec(content)) !== null) {
    const textBefore = content.substring(lastSecIndex, nodeMatch.index);
    if (textBefore.trim()) {
      sections.push(
        <MarkdownRenderer key={`sec-${lastSecIndex}`} content={textBefore} />
      );
    }

    sections.push(
      <NexoraNodePreviewCard key={`nexora-node-${nodeMatch.index}`} rawJson={nodeMatch[1]} />
    );

    lastSecIndex = nodeMatch.index + nodeMatch[0].length;
  }

  const remainingText = content.substring(lastSecIndex);
  if (remainingText.trim() || sections.length === 0) {
    sections.push(
      <MarkdownRenderer key={`sec-end-${lastSecIndex}`} content={remainingText} />
    );
  }

  return <div className="space-y-1.5 text-xs sm:text-sm leading-relaxed">{sections}</div>;
};

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  streamingMessage,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Auto-scroll to bottom on new messages or stream chunks
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingMessage]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

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
        </div>
      )}

      {/* Render Message History */}
      {messages.map((msg) => {
        const isUser = msg.role === 'user';
        const isCopied = copiedId === msg.id;

        return (
          <div
            key={msg.id}
            className={cn(
              'group flex gap-2.5 transition-all',
              isUser ? 'justify-end' : 'justify-start'
            )}
          >
            {/* Assistant Avatar */}
            {!isUser && (
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 text-white shadow-md shrink-0 mt-0.5">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
            )}

            {/* Bubble */}
            <div
              className={cn(
                'relative max-w-[85%] rounded-2xl p-3.5 shadow-lg',
                isUser
                  ? 'bg-gradient-to-br from-indigo-600/30 to-indigo-700/20 border border-indigo-500/40 text-white rounded-tr-sm'
                  : 'bg-[#131926] border border-white/10 text-slate-200 rounded-tl-sm shadow-xl'
              )}
            >
              {/* Attachments (e.g. uploaded images / PDFs) */}
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="mb-2.5 flex flex-wrap gap-2">
                  {msg.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#0B0F17]/80 px-2.5 py-1 text-[11px] text-slate-300"
                    >
                      {att.type === 'image' ? (
                        <ImageIcon className="h-3.5 w-3.5 text-cyan-400" />
                      ) : att.type === 'pdf' ? (
                        <FileText className="h-3.5 w-3.5 text-rose-400" />
                      ) : (
                        <FileCode className="h-3.5 w-3.5 text-indigo-400" />
                      )}
                      <span className="font-semibold truncate max-w-[120px]">{att.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        ({formatFileSize(att.size)})
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <RenderMessageContent content={msg.content} citations={msg.citations} />

              {/* Citations footer if present */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-white/10 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Sources:</span>
                  {msg.citations.map((c) => (
                    <ChatCitationBadge key={c.id} citation={c} />
                  ))}
                </div>
              )}

              {/* Message Hover Actions */}
              <div
                className={cn(
                  'absolute bottom-1 right-2 hidden opacity-0 group-hover:opacity-100 group-hover:flex items-center gap-1 transition-opacity'
                )}
              >
                <button
                  type="button"
                  onClick={() => handleCopy(msg.id, msg.content)}
                  className="rounded-md bg-[#0B0F17]/80 p-1 text-slate-400 hover:text-white border border-white/10 shadow-sm"
                  title={isCopied ? 'Copied' : 'Copy message text'}
                >
                  {isCopied ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              </div>
            </div>

            {/* User Avatar */}
            {isUser && (
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-600 text-white shadow shrink-0 mt-0.5">
                <User className="h-3.5 w-3.5" />
              </div>
            )}
          </div>
        );
      })}

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
              <div className="flex items-center gap-2 py-1 text-xs text-cyan-300">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
                </span>
                <span className="font-medium animate-pulse">
                  {(() => {
                    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
                    return lastUserMsg
                      ? getComplexityConfig(lastUserMsg.content).statusLabel
                      : 'Synthesizing response...';
                  })()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
