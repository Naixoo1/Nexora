'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Key,
  X,
  ShieldCheck,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  Trash2,
  Cpu,
  Sparkles,
  Zap,
  GraduationCap,
} from 'lucide-react';
import { useChatStore } from '@/stores/useChatStore';
import { useTranslation } from '@/hooks/useTranslation';
import { checkWebGPUSupport } from '@/services/web-llm-service';
import type { GradeLevel } from '@/types/planner';
import { cn } from '@/lib/utils';

export const ChatSettingsModal: React.FC = () => {
  const { t } = useTranslation();
  const {
    isSettingsOpen,
    setSettingsOpen,
    customApiKey,
    setCustomApiKey,
    useWebLLM,
    setUseWebLLM,
    gradeLevel,
    setGradeLevel,
  } = useChatStore();
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>(gradeLevel || 'SENIOR_HIGH');
  const [showKey, setShowKey] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);
  const [isWebGPUSupported, setIsWebGPUSupported] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    checkWebGPUSupport().then(setIsWebGPUSupported).catch(() => setIsWebGPUSupported(false));
  }, []);

  useEffect(() => {
    setSelectedGrade(gradeLevel || 'SENIOR_HIGH');
  }, [gradeLevel, isSettingsOpen]);

  useEffect(() => {
    if (customApiKey) {
      setApiKeyInput(customApiKey);
    } else {
      setApiKeyInput('');
    }
  }, [customApiKey, isSettingsOpen]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSettingsOpen) {
        setSettingsOpen(false);
      }
    };
    if (isSettingsOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isSettingsOpen, setSettingsOpen]);

  if (!mounted || !isSettingsOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setGradeLevel(selectedGrade);
    const trimmed = apiKeyInput.trim();
    if (trimmed) {
      setCustomApiKey(trimmed);
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        setSettingsOpen(false);
      }, 500);
    } else {
      setCustomApiKey(null);
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        setSettingsOpen(false);
      }, 500);
    }
  };

  const handleClear = () => {
    setCustomApiKey(null);
    setApiKeyInput('');
  };

  const modalContent = (
    <div className="fixed inset-0 select-auto">
      {/* High-Layer Backdrop */}
      <div
        className="fixed inset-0 z-[9998] bg-black/75 backdrop-blur-sm pointer-events-auto transition-opacity animate-in fade-in duration-150"
        onClick={() => setSettingsOpen(false)}
      />

      {/* High-Layer Centered Modal Container */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#0F1420] p-6 shadow-2xl ring-1 ring-cyan-500/20 pointer-events-auto select-auto animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-inner">
                <Key className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">
                  AI Engine & Calibration Settings
                </h3>
                <p className="text-[11px] text-slate-400 font-sans">
                  Configure Grade Level, Cloud BYOK or Local WebGPU AI
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors pointer-events-auto"
              title="Close settings"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Academic Grade Level Calibration */}
          <div className="my-4 rounded-2xl border border-white/10 bg-[#131926] p-3.5 space-y-2">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-cyan-400" />
              <div>
                <span className="text-xs font-semibold text-white block">Academic Tier Calibration</span>
                <span className="text-[10px] text-slate-400 font-sans">
                  Adjust explanation tone, depth & complexity
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {[
                { id: 'PRIMARY' as const, label: 'SD / Primary', sub: 'Fun & Analogies' },
                { id: 'JUNIOR_HIGH' as const, label: 'SMP / Junior', sub: 'Guided Steps' },
                { id: 'SENIOR_HIGH' as const, label: 'SMA / College', sub: 'Rigorous HOTS' },
              ].map((tier) => (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => setSelectedGrade(tier.id)}
                  className={cn(
                    'flex flex-col items-center justify-center rounded-xl p-2 text-center transition-all border',
                    selectedGrade === tier.id
                      ? 'border-cyan-500 bg-cyan-500/15 text-cyan-200 shadow-sm ring-1 ring-cyan-500/30'
                      : 'border-white/5 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <span className="text-[11px] font-bold">{tier.label}</span>
                  <span className="text-[9px] text-slate-400">{tier.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Current Active Status Indicator */}
          <div className="mb-4 rounded-2xl border border-white/5 bg-[#131926] p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-indigo-400" />
              <div>
                <span className="text-xs font-semibold text-white block">Active AI Pipeline</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {useWebLLM
                    ? 'Local WebGPU (Llama-3.2-1B)'
                    : customApiKey
                    ? 'Custom Gemini BYOK Key'
                    : 'Server Cascade (Gemini ➔ OpenRouter ➔ Groq)'}
                </span>
              </div>
            </div>
            {useWebLLM ? (
              <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-medium text-amber-300 border border-amber-500/20">
                <Zap className="h-3 w-3 text-amber-400" />
                WebGPU Local
              </span>
            ) : customApiKey ? (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-300 border border-emerald-500/20">
                <ShieldCheck className="h-3 w-3 text-emerald-400" />
                Custom BYOK
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-full bg-cyan-500/10 px-2.5 py-1 text-[10px] font-medium text-cyan-300 border border-cyan-500/20">
                <Sparkles className="h-3 w-3 text-cyan-400" />
                API Pool
              </span>
            )}
          </div>

          {/* On-Device AI (WebGPU) Toggle Section */}
          <div className="mb-4 rounded-2xl border border-white/10 bg-[#131926] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" />
                <div>
                  <span className="text-xs font-semibold text-white block">On-Device AI (WebGPU)</span>
                  <span className="text-[10px] text-slate-400 font-sans">
                    Run Llama-3.2 on local GPU for zero latency & offline privacy
                  </span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={useWebLLM}
                  disabled={!isWebGPUSupported}
                  onChange={(e) => setUseWebLLM(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed" />
              </label>
            </div>

            <div className="flex items-center justify-between text-[10px] border-t border-white/5 pt-2">
              <span className="text-slate-400 font-mono">
                WebGPU Hardware:
              </span>
              {isWebGPUSupported ? (
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Supported & Ready
                </span>
              ) : (
                <span className="text-slate-400 font-sans">
                  Unsupported / Disabled in Browser
                </span>
              )}
            </div>
          </div>

          {/* Cloud BYOK Form Input */}
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-200 mb-1.5">
                Gemini API Key (Optional BYOK)
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  autoComplete="off"
                  spellCheck={false}
                  className="relative z-10 w-full rounded-xl border border-white/10 bg-[#0B0F17] px-3.5 py-2.5 pr-10 text-xs font-mono text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all pointer-events-auto select-text"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 rounded-lg p-1 text-slate-400 hover:text-white pointer-events-auto"
                  title={showKey ? 'Hide key' : 'Show key'}
                >
                  {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-400 leading-relaxed">
                Your key is saved locally in your browser and sent securely via request headers. It is never persisted on our database.
              </p>
            </div>

            {/* Quick Links & Information */}
            <div className="flex items-center justify-between text-[11px] pt-1">
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 underline font-medium pointer-events-auto"
              >
                Get a free Gemini API Key
                <ExternalLink className="h-3 w-3" />
              </a>

              {customApiKey && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors pointer-events-auto"
                >
                  <Trash2 className="h-3 w-3" />
                  Reset to Pool
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 border-t border-white/10 pt-4 mt-4">
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors pointer-events-auto"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaved}
                className={cn(
                  'flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-lg transition-all pointer-events-auto',
                  isSaved
                    ? 'bg-emerald-600 shadow-emerald-500/20'
                    : 'bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-500 hover:brightness-110 shadow-cyan-500/20'
                )}
              >
                {isSaved ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Saved!
                  </>
                ) : (
                  t('chat.saveSettings')
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
