'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  User,
  Copy,
  Check,
  Bot,
  Brain,
  RotateCcw,
} from 'lucide-react';
import type { ChatMessage, ChatSourceCitation } from '@/types/chat';
import { LatexRenderer } from '../canvas/LatexRenderer';
import { ChatCitationBadge } from './ChatCitationBadge';
import { useChatStore } from '@/stores/useChatStore';
import { cn } from '@/lib/utils';

export interface ChatMessageListProps {
  messages: ChatMessage[];
  streamingMessage: string | null;
  isSending: boolean;
}

/**
 * Parses message text containing mixed markdown, LaTeX blocks ($$..$$ and $..$), and citation tags
 */
const RenderMessageContent: React.FC<{ content: string; citations?: ChatSourceCitation[] }> = ({
  content,
  citations = [],
}) => {
  // 1. Split content by block equations $$...$$
  const blockMathRegex = /\$\$([\s\S]*?)\$\$/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = blockMathRegex.exec(content)) !== null) {
    const textBefore = content.substring(lastIndex, match.index);
    if (textBefore) {
      parts.push(renderTextWithInlineMathAndCitations(textBefore, citations, `text-${lastIndex}`));
    }

    const formula = match[1].trim();
    parts.push(
      <div key={`math-block-${match.index}`} className="my-2">
        <LatexRenderer latex={formula} displayMode="block" showCopyButton />
      </div>
    );

    lastIndex = match.index + match[0].length;
  }

  const remainingText = content.substring(lastIndex);
  if (remainingText) {
    parts.push(renderTextWithInlineMathAndCitations(remainingText, citations, `text-end-${lastIndex}`));
  }

  return <div className="space-y-1.5 text-xs sm:text-sm leading-relaxed">{parts}</div>;
};

/**
 * Helper to parse inline math $...$ and citation tags [[type:id:label]]
 */
function renderTextWithInlineMathAndCitations(
  text: string,
  citations: ChatSourceCitation[],
  keyPrefix: string
): React.ReactNode {
  // Match inline math ($...$) OR citation tags ([[...]])
  const combinedRegex = /(\$([^\$\n]+)\$)|(\[\[(node|task|formula):([^:]+):?([^\]]*)\]\])/g;
  const elements: React.ReactNode[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = combinedRegex.exec(text)) !== null) {
    const plainText = text.substring(lastIdx, match.index);
    if (plainText) {
      elements.push(renderFormattedMarkdownText(plainText, `${keyPrefix}-plain-${lastIdx}`));
    }

    if (match[1]) {
      // Inline math $...$
      const inlineLatex = match[2].trim();
      elements.push(
        <LatexRenderer
          key={`${keyPrefix}-inline-${match.index}`}
          latex={inlineLatex}
          displayMode="inline"
          className="mx-0.5"
        />
      );
    } else if (match[3]) {
      // Citation tag [[node:id:Label]]
      const type = match[4];
      const refId = match[5].trim();
      const label = (match[6] && match[6].trim()) || (type === 'node' ? `Node: ${refId}` : `Task: ${refId}`);
      const citation: ChatSourceCitation = {
        id: `cite-${match.index}`,
        sourceType: type === 'node' ? 'canvas_node' : type === 'task' ? 'task' : 'formula',
        referenceId: refId,
        label,
      };

      elements.push(
        <ChatCitationBadge key={`${keyPrefix}-cite-${match.index}`} citation={citation} />
      );
    }

    lastIdx = match.index + match[0].length;
  }

  const remaining = text.substring(lastIdx);
  if (remaining) {
    elements.push(renderFormattedMarkdownText(remaining, `${keyPrefix}-plain-end`));
  }

  return <span key={keyPrefix}>{elements}</span>;
}

/**
 * Basic markdown renderer for bold, italic, lists, and linebreaks
 */
function renderFormattedMarkdownText(text: string, key: string): React.ReactNode {
  const lines = text.split('\n');

  return (
    <span key={key}>
      {lines.map((line, i) => {
        // Bullet list item
        const isBullet = line.trim().startsWith('* ') || line.trim().startsWith('- ');
        const cleanLine = isBullet ? line.trim().substring(2) : line;

        // Bold formatting **text**
        const boldParts = cleanLine.split(/(\*\*[^*]+\*\*)/g);

        return (
          <React.Fragment key={i}>
            {isBullet ? (
              <span className="flex items-start gap-1.5 my-0.5 pl-2">
                <span className="text-cyan-400 font-bold">•</span>
                <span>
                  {boldParts.map((p, j) =>
                    p.startsWith('**') && p.endsWith('**') ? (
                      <strong key={j} className="font-bold text-white">
                        {p.slice(2, -2)}
                      </strong>
                    ) : (
                      p
                    )
                  )}
                </span>
              </span>
            ) : (
              <span>
                {boldParts.map((p, j) =>
                  p.startsWith('**') && p.endsWith('**') ? (
                    <strong key={j} className="font-bold text-white">
                      {p.slice(2, -2)}
                    </strong>
                  ) : (
                    p
                  )
                )}
              </span>
            )}
            {i < lines.length - 1 && !isBullet && <br />}
          </React.Fragment>
        );
      })}
    </span>
  );
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  streamingMessage,
  isSending,
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
          <h4 className="mt-3 text-sm font-bold text-white">Nexora AI Brainstorming</h4>
          <p className="mt-1 text-xs text-slate-400 max-w-xs leading-relaxed">
            Ask conceptual questions, request step-by-step mathematical proofs, or brainstorm thesis methodologies.
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
              <div className="flex items-center gap-1.5 py-1 text-xs text-cyan-300">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
                <span>Nexora AI is formulating response...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
