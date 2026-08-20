'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
    sm: { sizeClass: 'w-6 h-6', px: 24, text: 'text-sm', badge: 'text-[9px] px-1 py-0.2' },
    md: { sizeClass: 'w-8 h-8', px: 32, text: 'text-base', badge: 'text-[10px] px-1.5 py-0.5' },
    lg: { sizeClass: 'w-10 h-10', px: 40, text: 'text-xl', badge: 'text-xs px-2 py-0.5' },
  }[size];

  const content = (
    <>
      {/* Brand Logo Container */}
      <div
        className={cn(
          'relative rounded-full overflow-hidden border border-cyan-500/30 shadow-sm shadow-cyan-500/20 shrink-0 transition-transform duration-200 group-hover:scale-105',
          dimensions.sizeClass
        )}
      >
        <Image
          alt="Nexora Logo"
          className="w-full h-full object-cover"
          width={dimensions.px}
          height={dimensions.px}
          priority
          unoptimized
          src="/logo.png"
        />
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
