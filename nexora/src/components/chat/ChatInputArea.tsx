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
  FileText,
  FileCode,
  LogIn,
  Languages,
} from 'lucide-react';
import { useChatStore } from '@/stores/useChatStore';
import { useTranslation } from '@/hooks/useTranslation';
import { useSpeechToText, cleanAndDeduplicateSpeech, sanitizeSpeechText } from '@/hooks/useSpeechToText';
import { authClient } from '@/lib/auth-client';
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
  'step-by-step': [
    '🔢 Provide a complete step-by-step mathematical expansion.',
    '✍️ Verify each algebraic line and state the theorem used.',
    '📐 Check intermediate boundaries and unit consistency.',
  ],
  brainstorming: [
    '💡 Brainstorm structured approaches and key research questions.',
    '📚 Suggest literature frameworks and methodology outlines.',
    '🔍 Break this multi-faceted problem into modular components.',
  ],
  thesis_mentor: [
    '📚 Help me articulate the research gap in this methodology.',
    '📊 Structure the empirical validation section for Chapter 3.',
    '🔍 Suggest relevant academic citations and theoretical frameworks.',
  ],
  general: [
    '💬 Explain this concept in simple, clear terms.',
    '📝 Help me summarize and format these ideas.',
    '⚡ Give me a fast, direct answer with examples.',
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
  const { t } = useTranslation();
  const { data: session, isPending: isAuthPending } = authClient.useSession();
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
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [speechLang, setSpeechLang] = useState<'id-ID' | 'en-US'>('id-ID');
  const [speechErrorDismissed, setSpeechErrorDismissed] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: typeof window !== 'undefined' ? window.location.pathname : '/',
      });
    } catch (err) {
      console.error('Sign-in failed:', err);
    } finally {
      setIsSigningIn(false);
    }
  };

  // Speech-to-Text integration with Real-Time Interim Ghost Text
  const {
    isListening,
    isSupported: isSpeechSupported,
    interimTranscript,
    error: speechError,
    startListening,
    stopListening,
    commitInterim,
  } = useSpeechToText({
    lang: speechLang,
    onFinalResult: (finalChunk) => {
      setInput((prev) => cleanAndDeduplicateSpeech(prev, finalChunk));
    },
  });

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input, interimTranscript]);

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
    } else if (
      mime.includes('text') ||
      mime.includes('json') ||
      mime.includes('javascript') ||
      mime.includes('typescript') ||
      mime.includes('markdown') ||
      file.name.endsWith('.tex') ||
      file.name.endsWith('.py') ||
      file.name.endsWith('.md')
    ) {
      type = 'text';
      if (file.size > MAX_TEXT_SIZE) {
        alert(`Document "${file.name}" exceeds maximum allowed size of 500 KB.`);
        return null;
      }
    } else {
      alert(`Unsupported file format: ${file.name}`);
      return null;
    }

    return new Promise((resolve) => {
      const reader = new FileReader();

      if (type === 'image' || type === 'pdf') {
        reader.onload = () => {
          const result = reader.result as string;
          resolve({
            id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            name: file.name,
            type,
            mimeType: mime,
            size: file.size,
            data: result,
          });
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = () => {
          const result = reader.result as string;
          resolve({
            id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            name: file.name,
            type,
            mimeType: mime,
            size: file.size,
            data: result,
          });
        };
        reader.readAsText(file);
      }
    });
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Limit to max 5 attachments total
    const remainingSlots = 5 - attachments.length;
    if (remainingSlots <= 0) {
      alert('You have already reached the maximum limit of 5 attachments.');
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    for (const file of filesToProcess) {
      const attachment = await processFile(file);
      if (attachment) {
        addAttachment(attachment);
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

    // If currently recording voice, commit pending interim text first
    if (isListening) {
      commitInterim();
      stopListening();
    }

    const sanitizedInput = sanitizeSpeechText(input);
    if ((!sanitizedInput && attachments.length === 0) || isSending) return;

    sendMessage(sanitizedInput);
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

  const toggleMic = () => {
    if (isListening) {
      commitInterim();
      stopListening();
    } else {
      setSpeechErrorDismissed(false);
      startListening({ lang: speechLang });
    }
  };

  const toggleSpeechLang = () => {
    const nextLang = speechLang === 'id-ID' ? 'en-US' : 'id-ID';
    setSpeechLang(nextLang);
    if (isListening) {
      commitInterim();
      stopListening();
      setTimeout(() => {
        startListening({ lang: nextLang });
      }, 100);
    }
  };

  const handleApplyStarter = (starterText: string) => {
    setInput(starterText);
    textareaRef.current?.focus();
  };

  const starters = PROMPT_STARTERS[activeTutorMode] || PROMPT_STARTERS.socratic;
  const canSend = (input.trim().length > 0 || attachments.length > 0 || interimTranscript.trim().length > 0) && !isSending;
  const isAuthenticated = Boolean(session?.user);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'relative shrink-0 border-t border-white/10 bg-[#131926]/95 p-3 sm:p-4 backdrop-blur-xl transition-all space-y-2.5',
        isDragging && 'border-cyan-400 bg-cyan-950/30'
      )}
    >
      {/* Hidden File Input for Paperclip Attachments */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain,text/markdown,.py,.tex,.json,.js,.ts"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Drag & Drop Visual Overlay */}
      {isDragging && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-cyan-950/80 backdrop-blur-sm rounded-t-xl border-2 border-dashed border-cyan-400">
          <p className="text-xs font-bold text-cyan-300 animate-pulse">
            📎 Drop textbook photos, math formulas, or PDF notes here
          </p>
        </div>
      )}

      {/* Active Context Chips */}
      {(taskContext || canvasContext) && (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          {taskContext && (
            <span className="inline-flex items-center gap-1 rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-indigo-300 font-mono">
              <CheckSquare className="h-3 w-3 text-indigo-400" />
              <span className="truncate max-w-[140px]">{taskContext.title}</span>
              <button
                type="button"
                onClick={() => setTaskContext(undefined)}
                className="hover:text-white ml-0.5"
                title="Detach Task Context"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          )}

          {canvasContext && (
            <span className="inline-flex items-center gap-1 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-cyan-300 font-mono">
              <Cpu className="h-3 w-3 text-cyan-400" />
              <span className="truncate max-w-[140px]">
                {canvasContext.selectedNodeTitle || canvasContext.canvasTitle}
              </span>
              <button
                type="button"
                onClick={() => setCanvasContext(undefined)}
                className="hover:text-white ml-0.5"
                title="Detach Canvas Context"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Speech Error Banner */}
      {speechError && !speechErrorDismissed && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-300">
          <span className="text-[11px] truncate">{speechError}</span>
          <button
            type="button"
            onClick={() => setSpeechErrorDismissed(true)}
            className="text-amber-400 hover:text-white shrink-0"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Attached Files Preview Grid */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 rounded-xl bg-[#0B0F17]/50 border border-white/5">
          {attachments.map((att) => {
            const isImg = att.type === 'image';
            const isPdf = att.type === 'pdf';

            return (
              <div
                key={att.id}
                className="relative group flex items-center gap-2 rounded-xl border border-white/10 bg-[#131926] p-1.5 shadow-md max-w-[210px]"
              >
                {/* Visual Thumbnail */}
                {isImg ? (
                  <div className="relative h-10 w-10 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-black/40">
                    <img
                      src={
                        att.data.startsWith('data:')
                          ? att.data
                          : `data:${att.mimeType};base64,${att.data}`
                      }
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

      {/* Subtle Informational Guest Banner if logged out */}
      {!isAuthPending && !isAuthenticated && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-cyan-500/20 bg-cyan-950/30 px-3 py-2 text-xs text-cyan-200 backdrop-blur-sm">
          <span className="text-[11px] text-slate-300 truncate">
            Browsing as Guest — Sign in with Google to save your chat history across devices.
          </span>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 px-2.5 py-1 text-[11px] font-semibold text-white shadow hover:opacity-90 active:scale-95 transition-all shrink-0"
          >
            {isSigningIn ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogIn className="h-3 w-3" />}
            <span>Sign in</span>
          </button>
        </div>
      )}

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

        {/* Microphone Button (Speech-to-Text) & Language Switcher */}
        {isSpeechSupported && (
          <div className="relative flex items-center shrink-0">
            <button
              type="button"
              onClick={toggleMic}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-xl border transition-all',
                isListening
                  ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300 ring-2 ring-cyan-400/40 shadow-[0_0_15px_rgba(6,182,212,0.4)] animate-pulse'
                  : 'border-white/10 bg-[#0B0F17] text-slate-400 hover:bg-white/10 hover:text-white'
              )}
              title={
                isListening
                  ? `Recording (${speechLang === 'id-ID' ? 'Indonesian' : 'English'}) — Click to commit`
                  : `Dictate with Voice (${speechLang === 'id-ID' ? 'Indonesian' : 'English'})`
              }
            >
              {isListening ? (
                <MicOff className="h-4 w-4 text-cyan-400 animate-bounce" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </button>

            {/* Language Selector Button */}
            <button
              type="button"
              onClick={toggleSpeechLang}
              className="absolute -top-2 -right-2 z-10 flex h-4 w-5 items-center justify-center rounded-full bg-[#1E2638] text-[9px] font-bold text-cyan-300 border border-cyan-500/30 shadow hover:bg-cyan-500 hover:text-black transition-colors"
              title={`Switch voice recognition language (Currently: ${speechLang})`}
            >
              {speechLang === 'id-ID' ? 'ID' : 'EN'}
            </button>
          </div>
        )}

        {/* Text Area with Live Real-Time Ghost Text Overlay */}
        <div className="relative flex-1">
          {/* Real-Time Ghost Text Overlay: Renders live interim transcript behind transparent textarea */}
          {isListening && interimTranscript && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-0 overflow-hidden px-3.5 py-2.5 text-xs sm:text-sm font-sans leading-normal whitespace-pre-wrap break-words select-none"
            >
              <span className="invisible">{input}</span>
              <span className="text-slate-400 opacity-60 italic font-medium">
                {input && !input.endsWith(' ') ? ' ' : ''}
                {interimTranscript}
              </span>
            </div>
          )}

          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={
              isListening
                ? `🎙️ Listening (${speechLang === 'id-ID' ? 'Bahasa Indonesia' : 'English'})... Speak now`
                : t('chat.inputPlaceholder')
            }
            disabled={isSending}
            className={cn(
              'relative z-10 w-full resize-none rounded-xl border border-white/10 bg-[#0B0F17] px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/30 max-h-32 disabled:opacity-50',
              isListening && interimTranscript && 'bg-transparent',
              isListening && !interimTranscript && 'border-cyan-500/50 bg-cyan-950/20'
            )}
          />

          {/* Real-time Listening Waveform Tag */}
          {isListening && (
            <div className="absolute right-3 top-2.5 z-20 flex items-center gap-1.5 rounded-md bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-medium text-cyan-300 border border-cyan-500/20 pointer-events-none">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-500"></span>
              </span>
              <span>{speechLang === 'id-ID' ? 'ID Voice' : 'EN Voice'}</span>
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
