'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Globe } from 'lucide-react';
import { useLanguageStore, LANGUAGE_OPTIONS, type AppLocale } from '@/stores/useLanguageStore';
import { cn } from '@/lib/utils';

interface LanguageSelectorProps {
  className?: string;
  variant?: 'compact' | 'full';
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  className,
  variant = 'compact',
}) => {
  const { locale, setLocale } = useLanguageStore();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeOption =
    LANGUAGE_OPTIONS.find((opt) => opt.code === locale) || LANGUAGE_OPTIONS[0];

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectLanguage = (selectedCode: AppLocale) => {
    setLocale(selectedCode);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn('relative inline-block text-left', className)}>
      {/* Dropdown Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        title="Ganti Bahasa / Change Language"
        className={cn(
          'flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#131926]/90 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition-all backdrop-blur-md',
          'hover:border-cyan-500/40 hover:bg-[#1E2638] hover:text-white active:scale-95',
          isOpen && 'border-cyan-400/60 ring-2 ring-cyan-400/20 text-white'
        )}
      >
        <span className="text-sm leading-none" role="img" aria-label={activeOption.label}>
          {activeOption.flag}
        </span>
        <span className="font-mono text-[11px] font-bold text-slate-200">
          {activeOption.shortCode}
        </span>
        <ChevronDown
          className={cn(
            'h-3 w-3 text-slate-400 transition-transform duration-200',
            isOpen && 'rotate-180 text-cyan-400'
          )}
        />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Select Language"
          className="absolute right-0 z-50 mt-1.5 w-48 origin-top-right rounded-2xl border border-white/10 bg-[#131926]/95 p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-b border-white/5 pb-1.5 mb-1">
            <Globe className="h-3 w-3 text-cyan-400" />
            <span>Pilih Bahasa (Language)</span>
          </div>

          <div className="space-y-0.5">
            {LANGUAGE_OPTIONS.map((option) => {
              const isSelected = option.code === locale;

              return (
                <button
                  key={option.code}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelectLanguage(option.code)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs text-left transition-all',
                    isSelected
                      ? 'bg-cyan-500/15 text-cyan-300 font-bold border border-cyan-500/30'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm leading-none">{option.flag}</span>
                    <div className="flex flex-col">
                      <span className="font-medium text-xs text-white">{option.nativeLabel}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {option.shortCode} ({option.code})
                      </span>
                    </div>
                  </div>

                  {isSelected && <Check className="h-3.5 w-3.5 text-cyan-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
