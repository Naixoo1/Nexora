'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Copy, Check } from 'lucide-react';
import { LatexRenderer } from '../canvas/LatexRenderer';
import { preprocessLatex } from '@/utils/latex-formatter';
import { cn } from '@/lib/utils';

export interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Strips raw or fenced canvas node JSON payloads from text to keep chat UI 100% clean.
 */
export function stripCanvasNodeBlocks(text: string): string {
  if (!text) return '';

  return text
    // 1. Strip fenced nexora-node or node codeblocks
    .replace(/```(?:nexora-node|node)\s*[\s\S]*?```/gi, '')
    // 2. Strip fenced JSON codeblocks containing create_node or node schemas
    .replace(/```json\s*\{[\s\S]*?"(?:action|type|nodeType|latexFormula)"[\s\S]*?\}\s*```/gi, '')
    // 3. Strip unfenced raw nexora-node { ... } blocks
    .replace(/(?:^|\n)\s*nexora-node\s*\{[\s\S]*?\}/gi, '')
    // 4. Strip raw JSON create_node action objects
    .replace(/(?:^|\n)\s*\{\s*"action"\s*:\s*"create_node"[\s\S]*?\}/gi, '')
    .trim();
}

/**
 * Preprocesses raw markdown string to ensure correct header formatting,
 * strip canvas node JSON blocks, normalize LaTeX delimiters/escapes, and ensure newline padding.
 */
export function cleanMarkdownText(raw: string): string {
  if (!raw) return '';

  // 1. Strip raw and fenced canvas node payloads
  let text = stripCanvasNodeBlocks(raw);

  // 2. Normalize LaTeX math blocks, bracket delimiters, and double-escaped slashes
  text = preprocessLatex(text);

  // 3. Ensure headers (#, ##, ###, ####, etc.) have empty line padding before them if preceded by text
  text = text.replace(/([^\n])\n(#{1,6}\s+)/g, '$1\n\n$2');

  // 4. Strip redundant wrapping bold markers inside headers (e.g., `### **Title**` -> `### Title`, `#### **Title ($x$):**` -> `#### Title ($x$):`)
  text = text.replace(/^(#{1,6}\s+)\*\*(.*?)\*\*(\:?)$/gm, '$1$2$3');
  text = text.replace(/^(#{1,6}\s+)\*\*(.*?)\*\*/gm, '$1$2');

  return text;
}

const CodeBlock: React.FC<{
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}> = ({ inline, className, children, ...props }) => {
  const [copied, setCopied] = React.useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const codeString = String(children || '').replace(/\n$/, '');

  // If LaTeX display math handled by remarkMath
  if (language === 'math') {
    return <LatexRenderer latex={codeString} displayMode="block" showCopyButton />;
  }

  if (inline) {
    return (
      <code
        className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-cyan-300"
        {...props}
      >
        {children}
      </code>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-2.5 overflow-hidden rounded-xl border border-white/10 bg-[#0B0F17] shadow-lg">
      <div className="flex items-center justify-between border-b border-white/10 bg-[#131926] px-3 py-1 text-[10px] text-slate-400 font-mono">
        <span>{language || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-xs text-slate-200 leading-relaxed">
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    </div>
  );
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  const sanitized = React.useMemo(() => cleanMarkdownText(content), [content]);

  return (
    <div className={cn('markdown-body text-xs sm:text-sm text-slate-200 leading-relaxed space-y-1', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ children, ...props }) => (
            <h1
              className="mt-3.5 mb-1.5 text-sm sm:text-base font-bold text-white tracking-tight border-b border-white/10 pb-1"
              {...props}
            >
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2
              className="mt-3 mb-1.5 text-xs sm:text-sm font-bold text-cyan-300 tracking-tight"
              {...props}
            >
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3
              className="mt-2.5 mb-1 text-xs sm:text-sm font-bold text-white tracking-tight"
              {...props}
            >
              {children}
            </h3>
          ),
          h4: ({ children, ...props }) => (
            <h4
              className="mt-2 mb-0.5 text-xs sm:text-sm font-semibold text-cyan-200 tracking-tight"
              {...props}
            >
              {children}
            </h4>
          ),
          p: ({ children, ...props }) => (
            <p className="my-1 leading-relaxed text-slate-200" {...props}>
              {children}
            </p>
          ),
          ul: ({ children, ...props }) => (
            <ul className="my-1.5 ml-4 list-disc space-y-0.5 text-slate-200" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="my-1.5 ml-4 list-decimal space-y-0.5 text-slate-200" {...props}>
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li className="leading-relaxed pl-0.5" {...props}>
              {children}
            </li>
          ),
          strong: ({ children, ...props }) => (
            <strong className="font-bold text-white" {...props}>
              {children}
            </strong>
          ),
          em: ({ children, ...props }) => (
            <em className="italic text-slate-300" {...props}>
              {children}
            </em>
          ),
          blockquote: ({ children, ...props }) => (
            <blockquote
              className="my-2 border-l-2 border-cyan-400 bg-cyan-950/20 py-1 pl-3 pr-2 text-xs italic text-slate-300 rounded-r-lg"
              {...props}
            >
              {children}
            </blockquote>
          ),
          table: ({ children, ...props }) => (
            <div className="my-2.5 overflow-x-auto rounded-xl border border-white/10 bg-[#0B0F17]">
              <table className="min-w-full divide-y divide-white/10 text-xs" {...props}>
                {children}
              </table>
            </div>
          ),
          thead: ({ children, ...props }) => (
            <thead className="bg-[#131926] text-white" {...props}>
              {children}
            </thead>
          ),
          th: ({ children, ...props }) => (
            <th className="px-3 py-1.5 text-left font-semibold text-slate-300" {...props}>
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td className="px-3 py-1.5 border-t border-white/5 text-slate-300" {...props}>
              {children}
            </td>
          ),
          code: CodeBlock as any,
        }}
      >
        {sanitized}
      </ReactMarkdown>
    </div>
  );
};
