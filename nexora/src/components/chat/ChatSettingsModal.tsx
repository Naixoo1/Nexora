'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useChatStore } from '@/stores/useChatStore';
import { cn } from '@/lib/utils';

export const ChatSettingsModal: React.FC = () => {
  const { isSettingsOpen, setSettingsOpen, customApiKey, setCustomApiKey } = useChatStore();
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [showKey, setShowKey] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  useEffect(() => {
    if (customApiKey) {
      setApiKeyInput(customApiKey);
    } else {
      setApiKeyInput('');
    }
  }, [customApiKey, isSettingsOpen]);

  if (!isSettingsOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = apiKeyInput.trim();
    if (trimmed) {
      setCustomApiKey(trimmed);
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        setSettingsOpen(false);
      }, 800);
    } else {
      setCustomApiKey(null);
      setSettingsOpen(false);
    }
  };

  const handleClear = () => {
    setCustomApiKey(null);
    setApiKeyInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#0F1420] p-6 shadow-2xl ring-1 ring-cyan-500/20"
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
                AI Engine & BYOK Settings
              </h3>
              <p className="text-[11px] text-slate-400 font-sans">
                Bring Your Own Key or use Nexora pool
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen(false)}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Current Active Status Indicator */}
        <div className="my-4 rounded-2xl border border-white/5 bg-[#131926] p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-indigo-400" />
            <div>
              <span className="text-xs font-semibold text-white block">Active AI Provider</span>
              <span className="text-[10px] text-slate-400 font-mono">
                Cascade: gemini-2.5-flash ➔ 1.5-flash ➔ 2.5-pro
              </span>
            </div>
          </div>
          {customApiKey ? (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-300 border border-emerald-500/20">
              <ShieldCheck className="h-3 w-3 text-emerald-400" />
              Custom BYOK Active
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-cyan-500/10 px-2.5 py-1 text-[10px] font-medium text-cyan-300 border border-cyan-500/20">
              <Sparkles className="h-3 w-3 text-cyan-400" />
              Server API Pool
            </span>
          )}
        </div>

        {/* Form Input */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-200 mb-1.5">
              Gemini API Key (Optional)
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full rounded-xl border border-white/10 bg-[#0B0F17] px-3.5 py-2.5 pr-10 text-xs font-mono text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:text-white"
                title={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400 leading-relaxed">
              Your key is saved locally in your browser and sent securely via headers. Never stored on our backend.
            </p>
          </div>

          {/* Quick Links & Information */}
          <div className="flex items-center justify-between text-[11px] pt-1">
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 underline font-medium"
            >
              Get a free Gemini API Key
              <ExternalLink className="h-3 w-3" />
            </a>

            {customApiKey && (
              <button
                type="button"
                onClick={handleClear}
                className="flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors"
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
              className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaved}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-lg transition-all',
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
                'Save Settings'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
