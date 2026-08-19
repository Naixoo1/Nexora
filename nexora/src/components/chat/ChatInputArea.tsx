'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  CheckSquare,
  Cpu,
  X,
  Loader2,
  Paperclip,
  Mic,
  MicOff,
  Image as ImageIcon,
  FileText,
  FileCode,
  Sparkles,
} from 'lucide-react';
import { useChatStore } from '@/stores/useChatStore';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import type { AcademicTutorMode, ChatAttachment, ChatAttachmentType } from '@/types/chat';
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

const MAX_IMAGE_SIZE = 4 * 1024 * 1024; // 4 MB
const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_TEXT_SIZE = 512 * 1024; // 500 KB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const ChatInputArea: React.FC = () => {
  const {
    activeTutorMode,
    taskContext,
    canvasContext,
    attachments,
    isSending,
    sendMessage,
    addAttachment,
    removeAttachment,
    setTaskContext,
    setCanvasContext,
  } = useChatStore();

  const [input, setInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Speech-to-Text integration
  const {
    isListening,
    isSupported: isSpeechSupported,
    interimTranscript,
    startListening,
    stopListening,
  } = useSpeechToText({
    onResult: (spokenText) => {
      setInput((prev) => (prev ? `${prev} ${spokenText}` : spokenText));
    },
  });

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Process raw File object into ChatAttachment
  const processFile = async (file: File): Promise<ChatAttachment | null> => {
    let type: ChatAttachmentType = 'text';
    const mime = file.type || 'text/plain';

    if (mime.startsWith('image/')) {
      type = 'image';
      if (file.size > MAX_IMAGE_SIZE) {
        alert(`Image "${file.name}" exceeds maximum allowed size of 4 MB.`);
        return null;
      }
    } else if (mime === 'application/pdf') {
      type = 'pdf';
      if (file.size > MAX_PDF_SIZE) {
        alert(`PDF "${file.name}" exceeds maximum allowed size of 10 MB.`);
        return null;
      }
    } else {
      type = 'text';
      if (file.size > MAX_TEXT_SIZE) {
        alert(`Text file "${file.name}" exceeds maximum allowed size of 500 KB.`);
        return null;
      }
    }

    return new Promise<ChatAttachment>((resolve, reject) => {
      const reader = new FileReader();

      if (type === 'image' || type === 'pdf') {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }

      reader.onload = () => {
        const rawResult = reader.result as string;
        let data = rawResult;

        // If data URL format (e.g. data:image/png;base64,....), keep base64 or whole data URL
        if (type === 'image' || type === 'pdf') {
          const commaIdx = rawResult.indexOf(',');
          if (commaIdx !== -1) {
            data = rawResult.substring(commaIdx + 1);
          }
        }

        resolve({
          id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: file.name,
          type,
          mimeType: mime,
          data,
          size: file.size,
        });
      };

      reader.onerror = (err) => reject(err);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);

    for (const file of files) {
      try {
        const attachment = await processFile(file);
        if (attachment) {
          addAttachment(attachment);
        }
      } catch (err) {
        console.error('Failed to read file:', err);
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Clipboard Paste (e.g. pasting screenshots from Snipping Tool)
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    let hasFile = false;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          hasFile = true;
          const attachment = await processFile(file);
          if (attachment) {
            addAttachment(attachment);
          }
        }
      }
    }

    if (hasFile) {
      e.preventDefault();
    }
  };

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      for (const file of files) {
        const attachment = await processFile(file);
        if (attachment) {
          addAttachment(attachment);
        }
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isSending) return;

    if (isListening) {
      stopListening();
    }

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

  const toggleMic = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const starters = PROMPT_STARTERS[activeTutorMode] || PROMPT_STARTERS.socratic;
  const canSend = Boolean(input.trim() || attachments.length > 0) && !isSending;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'border-t border-white/10 bg-[#131926]/95 p-3.5 space-y-2.5 backdrop-blur-xl transition-all',
        isDragging && 'ring-2 ring-cyan-400 bg-cyan-950/20'
      )}
    >
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain,text/markdown"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Active Workspace Context Chips */}
      {(taskContext || canvasContext) && (
        <div className="flex flex-wrap items-center gap-1.5 pb-0.5">
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

      {/* Multimodal Attachment Preview Strip */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pb-1">
          {attachments.map((att) => {
            const isImg = att.type === 'image';
            const isPdf = att.type === 'pdf';

            return (
              <div
                key={att.id}
                className="group relative flex items-center gap-2 rounded-xl border border-white/10 bg-[#0B0F17] p-1.5 pr-3 shadow-md"
              >
                {/* Thumbnail or Icon */}
                {isImg ? (
                  <div className="relative h-10 w-10 overflow-hidden rounded-lg border border-white/10 bg-black/50 shrink-0">
                    <img
                      src={`data:${att.mimeType};base64,${att.data}`}
                      alt={att.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : isPdf ? (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/30 shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 shrink-0">
                    <FileCode className="h-5 w-5" />
                  </div>
                )}

                {/* Details */}
                <div className="min-w-0 flex-1 text-[11px]">
                  <p className="font-semibold text-white truncate max-w-[130px]">{att.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{formatFileSize(att.size)}</p>
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => removeAttachment(att.id)}
                  className="rounded-full bg-white/10 p-1 text-slate-400 hover:bg-rose-500/20 hover:text-rose-300 transition-colors"
                  title="Remove attachment"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
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

      {/* Main Input Form with Voice & Attachment Actions */}
      <form onSubmit={handleSubmit} className="relative flex items-end gap-2">
        {/* Paperclip Attachment Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSending || attachments.length >= 5}
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#0B0F17] text-slate-400 transition-all hover:bg-white/10 hover:text-white',
            attachments.length >= 5 && 'opacity-40 cursor-not-allowed'
          )}
          title="Attach textbook image (PNG/JPG) or PDF notes"
        >
          <Paperclip className="h-4 w-4" />
        </button>

        {/* Microphone Button (Speech-to-Text) */}
        {isSpeechSupported && (
          <button
            type="button"
            onClick={toggleMic}
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-all',
              isListening
                ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300 ring-2 ring-cyan-400/40 shadow-[0_0_15px_rgba(6,182,212,0.4)] animate-pulse'
                : 'border-white/10 bg-[#0B0F17] text-slate-400 hover:bg-white/10 hover:text-white'
            )}
            title={isListening ? 'Stop recording voice' : 'Dictate with Voice (Web Speech)'}
          >
            {isListening ? (
              <MicOff className="h-4 w-4 text-cyan-400 animate-bounce" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </button>
        )}

        {/* Text Area */}
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={
              isListening
                ? '🎙️ Listening... Speak your question now'
                : 'Ask Nexora AI, paste screenshot, or drag & drop files...'
            }
            disabled={isSending}
            className={cn(
              'w-full resize-none rounded-xl border border-white/10 bg-[#0B0F17] px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/30 max-h-32 disabled:opacity-50',
              isListening && 'border-cyan-500/50 bg-cyan-950/20'
            )}
          />

          {/* Interim speech transcript hint */}
          {isListening && interimTranscript && (
            <div className="absolute left-3.5 bottom-1 text-[10px] text-cyan-300 italic truncate max-w-[90%]">
              {interimTranscript}
            </div>
          )}
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={!canSend}
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-lg transition-all',
            canSend
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
