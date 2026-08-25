'use client';

import React, { useState } from 'react';
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
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { ChatMessage, ChatSourceCitation } from '@/types/chat';
import { LatexRenderer } from '../canvas/LatexRenderer';
import { ChatCitationBadge } from './ChatCitationBadge';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';

export interface ChatMessageItemProps {
  message: ChatMessage;
  isPlaying?: boolean;
  onSpeak?: (text: string) => void;
  onStopSpeak?: () => void;
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
    let parsed = JSON.parse(rawJson.trim());
    if (parsed.action === 'create_node' && parsed.node) {
      parsed = parsed.node;
    }
    const data: NexoraNodePayload = parsed;
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
          <div className="text-[11px] text-slate-300 leading-relaxed font-sans mt-1">
            <MarkdownRenderer content={desc} />
          </div>
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

export const RenderMessageContent: React.FC<{ content: string; citations?: ChatSourceCitation[] }> = ({
  content,
}) => {
  const nexoraNodeRegex =
    /```(?:nexora-node|node)\s*([\s\S]*?)\s*```|```json\s*(\{[\s\S]*?"(?:action|title)"[\s\S]*?\})\s*```/gi;
  const sections: React.ReactNode[] = [];
  let lastSecIndex = 0;
  let nodeMatch: RegExpExecArray | null;

  while ((nodeMatch = nexoraNodeRegex.exec(content)) !== null) {
    const textBefore = content.substring(lastSecIndex, nodeMatch.index);
    if (textBefore.trim()) {
      sections.push(<MarkdownRenderer key={`sec-${lastSecIndex}`} content={textBefore} />);
    }

    const payloadJson = nodeMatch[1] || nodeMatch[2] || '';
    if (payloadJson.trim()) {
      sections.push(
        <NexoraNodePreviewCard key={`nexora-node-${nodeMatch.index}`} rawJson={payloadJson} />
      );
    }

    lastSecIndex = nodeMatch.index + nodeMatch[0].length;
  }

  const remainingText = content.substring(lastSecIndex);
  if (remainingText.trim() || sections.length === 0) {
    sections.push(<MarkdownRenderer key={`sec-end-${lastSecIndex}`} content={remainingText} />);
  }

  return <div className="space-y-1.5 text-xs sm:text-sm leading-relaxed">{sections}</div>;
};

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  isPlaying = false,
  onSpeak,
  onStopSpeak,
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState<boolean>(false);
  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleSpeak = () => {
    if (isPlaying) {
      onStopSpeak?.();
    } else {
      onSpeak?.(message.content);
    }
  };

  return (
    <div
      className={cn(
        'group relative flex gap-2.5 transition-all',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {/* Assistant Avatar */}
      {!isUser && (
        <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 text-white shadow-md shrink-0 mt-0.5">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
      )}

      {/* Bubble Container */}
      <div
        className={cn(
          'relative max-w-[85%] rounded-2xl p-3.5 shadow-lg transition-all',
          isUser
            ? 'bg-gradient-to-br from-indigo-600/30 to-indigo-700/20 border border-indigo-500/40 text-white rounded-tr-sm'
            : 'bg-[#131926] border border-white/10 text-slate-200 rounded-tl-sm shadow-xl',
          isPlaying && 'ring-2 ring-cyan-400/50 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
        )}
      >
        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mb-2.5 flex flex-wrap gap-2">
            {message.attachments.map((att) => (
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

        {/* Message Content */}
        <RenderMessageContent content={message.content} citations={message.citations} />

        {/* Citations Footer */}
        {message.citations && message.citations.length > 0 && (
          <div className="mt-2.5 pt-2 border-t border-white/10 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400">
              {t('chat.sources')}:
            </span>
            {message.citations.map((c) => (
              <ChatCitationBadge key={c.id} citation={c} />
            ))}
          </div>
        )}

        {/* Message Actions (Copy & Read Aloud) */}
        <div
          className={cn(
            'absolute bottom-1 right-2 flex items-center gap-1 transition-opacity',
            isPlaying
              ? 'opacity-100 flex'
              : 'opacity-0 group-hover:opacity-100 hidden group-hover:flex'
          )}
        >
          {/* Read Aloud Button */}
          <button
            type="button"
            onClick={handleToggleSpeak}
            className={cn(
              'rounded-md p-1 border transition-all shadow-sm flex items-center gap-1',
              isPlaying
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40 shadow-[0_0_10px_rgba(6,182,212,0.3)] animate-pulse'
                : 'bg-[#0B0F17]/80 text-slate-400 hover:text-white border-white/10'
            )}
            title={isPlaying ? t('chat.stopListen') : t('chat.listenMsg')}
          >
            {isPlaying ? (
              <>
                <VolumeX className="h-3 w-3 text-cyan-300" />
                <span className="flex items-end gap-0.5 h-2 px-0.5">
                  <span className="w-0.5 h-2 bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-0.5 h-3 bg-cyan-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-0.5 h-1.5 bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </>
            ) : (
              <Volume2 className="h-3 w-3" />
            )}
          </button>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-md bg-[#0B0F17]/80 p-1 text-slate-400 hover:text-white border border-white/10 shadow-sm"
            title={copied ? 'Copied' : t('chat.copyMsg')}
          >
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
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
};
