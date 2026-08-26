'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NexoraLogoProps {
  className?: string;
  showVersion?: boolean;
  size?: 'sm' | 'md' | 'lg';
  href?: string | null;
  src?: string;
}

export const NexoraLogo: React.FC<NexoraLogoProps> = ({
  className,
  showVersion = true,
  size = 'md',
  href = '/',
  src = '/logo.png',
}) => {
  const [hasError, setHasError] = useState(false);

  const dimensions = {
    sm: { sizeClass: 'w-6 h-6', px: 24, text: 'text-sm', badge: 'text-[9px] px-1 py-0.2', iconSize: 12 },
    md: { sizeClass: 'w-8 h-8', px: 32, text: 'text-base', badge: 'text-[10px] px-1.5 py-0.5', iconSize: 16 },
    lg: { sizeClass: 'w-10 h-10', px: 40, text: 'text-xl', badge: 'text-xs px-2 py-0.5', iconSize: 20 },
  }[size];

  const content = (
    <>
      {/* Brand Logo Container */}
      <div
        className={cn(
          'relative rounded-full overflow-hidden border border-cyan-500/30 shadow-sm shadow-cyan-500/20 shrink-0 transition-transform duration-200 group-hover:scale-105 bg-gradient-to-br from-indigo-600 via-sky-500 to-cyan-400',
          dimensions.sizeClass
        )}
      >
        {!hasError ? (
          <Image
            alt="Nexora Logo"
            className="w-full h-full object-cover"
            width={dimensions.px}
            height={dimensions.px}
            priority
            unoptimized
            src={src}
            onError={() => setHasError(true)}
          />
        ) : (
          /* Resilient Inline SVG / Vector Fallback */
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-600 via-sky-500 to-cyan-400 text-white font-extrabold shadow-inner select-none">
            <svg
              viewBox="0 0 100 100"
              className="w-full h-full p-1"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="50" cy="50" r="46" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
              <path
                d="M30 70 V30 L55 57 V30 H65 V70 L40 43 V70 Z"
                fill="#FFFFFF"
              />
              <path
                d="M72 24 Q72 30 66 30 Q72 30 72 36 Q72 30 78 30 Q72 30 72 24 Z"
                fill="#FDE047"
              />
            </svg>
          </div>
        )}
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
