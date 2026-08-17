'use client';

import React, { useMemo, useState } from 'react';
import katex from 'katex';
import { Copy, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LatexRendererProps {
  latex?: string;
  displayMode?: 'inline' | 'block';
  className?: string;
  showCopyButton?: boolean;
}

/**
 * Renders mathematical expressions safely using KaTeX with inline and block support.
 */
export const LatexRenderer: React.FC<LatexRendererProps> = ({
  latex = '',
  displayMode = 'block',
  className,
  showCopyButton = false,
}) => {
  const [copied, setCopied] = useState(false);

  // Clean raw LaTeX expression if wrapped in $ or $$
  const cleanLatex = useMemo(() => {
    let text = latex.trim();
    if (!text) return '';

    if (text.startsWith('$$') && text.endsWith('$$')) {
      text = text.slice(2, -2).trim();
    } else if (text.startsWith('$') && text.endsWith('$')) {
      text = text.slice(1, -1).trim();
    } else if (text.startsWith('\\[') && text.endsWith('\\]')) {
      text = text.slice(2, -2).trim();
    } else if (text.startsWith('\\(') && text.endsWith('\\)')) {
      text = text.slice(2, -2).trim();
    }

    return text;
  }, [latex]);

  const { html, error } = useMemo(() => {
    if (!cleanLatex) return { html: '', error: null };

    try {
      const renderedHtml = katex.renderToString(cleanLatex, {
        displayMode: displayMode === 'block',
        throwOnError: false,
        output: 'htmlAndMathml',
      });
      return { html: renderedHtml, error: null };
    } catch (err) {
      console.warn('KaTeX render error:', err);
      return { html: '', error: err instanceof Error ? err.message : 'Invalid LaTeX syntax' };
    }
  }, [cleanLatex, displayMode]);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!cleanLatex) return;

    try {
      await navigator.clipboard.writeText(cleanLatex);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy LaTeX:', err);
    }
  };

  if (!cleanLatex) {
    return null;
  }

  if (error) {
    return (
      <div
        className={cn(
          'flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs text-red-400 font-mono overflow-x-auto',
          className
        )}
      >
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        <span>{cleanLatex}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group/math relative rounded-lg transition-all',
        displayMode === 'block' &&
          'my-1.5 overflow-x-auto bg-[#0B0F17]/80 px-3 py-2 border border-white/5 text-slate-100',
        displayMode === 'inline' && 'inline-block px-1 align-baseline',
        className
      )}
    >
      <div
        className="katex-content select-text text-sm sm:text-base leading-relaxed"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {showCopyButton && (
        <button
          type="button"
          onClick={handleCopy}
          className="absolute right-1.5 top-1.5 hidden rounded-md bg-[#131926] p-1 text-slate-400 opacity-0 shadow transition-all hover:text-white group-hover/math:flex group-hover/math:opacity-100 border border-white/10"
          title={copied ? 'Copied LaTeX' : 'Copy LaTeX formula'}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      )}
    </div>
  );
};
