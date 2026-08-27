'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface NexoraLogoProps {
  className?: string;
  showVersion?: boolean;
  size?: 'sm' | 'md' | 'lg';
  href?: string | null;
}

export const NexoraLogo: React.FC<NexoraLogoProps> = ({
  className,
  showVersion = true,
  size = 'md',
  href = '/',
}) => {
  const dimensions = {
    sm: { sizeClass: 'w-6 h-6', text: 'text-sm', badge: 'text-[9px] px-1 py-0.2' },
    md: { sizeClass: 'w-8 h-8', text: 'text-base', badge: 'text-[10px] px-1.5 py-0.5' },
    lg: { sizeClass: 'w-10 h-10', text: 'text-xl', badge: 'text-xs px-2 py-0.5' },
  }[size];

  const content = (
    <>
      {/* Pure Self-Contained Inline SVG Brand Emblem */}
      <div
        className={cn(
          'relative rounded-full overflow-hidden border border-cyan-500/30 shadow-sm shadow-cyan-500/20 shrink-0 transition-transform duration-200 group-hover:scale-105 select-none',
          dimensions.sizeClass
        )}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Nexora Logo"
        >
          <defs>
            <linearGradient id="nexoraBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4F46E5" />
              <stop offset="50%" stopColor="#0EA5E9" />
              <stop offset="100%" stopColor="#06B6D4" />
            </linearGradient>
            <filter id="nexoraGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Circular Base Gradient Badge */}
          <rect width="100" height="100" rx="50" fill="url(#nexoraBgGrad)" />
          <circle cx="50" cy="50" r="47" fill="none" stroke="rgba(255, 255, 255, 0.25)" strokeWidth="2" />

          {/* Stylized Nexora 'N' Geometry */}
          <path
            d="M30 70 V30 L55 57 V30 H64 V70 L39 43 V70 Z"
            fill="#FFFFFF"
            filter="url(#nexoraGlowFilter)"
          />

          {/* Top-Right AI Sparkle Star */}
          <path
            d="M72 23 Q72 29 66 29 Q72 29 72 35 Q72 29 78 29 Q72 29 72 23 Z"
            fill="#FDE047"
          />
        </svg>
      </div>

      {/* Brand Text & Version Badge */}
      <div className="flex items-center gap-1.5 min-w-0">
        <span
          className={cn(
            'font-bold tracking-tight text-white transition-colors group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:via-cyan-200 group-hover:to-cyan-400',
            dimensions.text
          )}
        >
          Nexora
        </span>

        {showVersion && (
          <span
            className={cn(
              'rounded-full border border-cyan-500/30 bg-cyan-500/10 font-mono font-semibold text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.15)]',
              dimensions.badge
            )}
          >
            v1.0
          </span>
        )}
      </div>
    </>
  );

  const sharedClasses = cn(
    'group flex items-center gap-2.5 transition-all duration-300 select-none',
    className
  );

  if (!href) {
    return (
      <div className={sharedClasses} title="Nexora — Academic Companion">
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={sharedClasses}
      title="Nexora — Academic Companion"
    >
      {content}
    </Link>
  );
};
