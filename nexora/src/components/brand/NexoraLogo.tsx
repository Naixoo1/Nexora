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
    sm: { img: 24, text: 'text-sm', badge: 'text-[9px] px-1 py-0.2' },
    md: { img: 32, text: 'text-base', badge: 'text-[10px] px-1.5 py-0.5' },
    lg: { img: 40, text: 'text-xl', badge: 'text-xs px-2 py-0.5' },
  }[size];

  const content = (
    <>
      {/* Brand Logo with Ambient Aurora Glow */}
      <div className="relative flex items-center justify-center shrink-0">
        <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-indigo-500 via-sky-400 to-cyan-400 opacity-25 blur transition duration-300 group-hover:opacity-75 group-hover:blur-md" />
        <div className="relative overflow-hidden rounded-lg border border-white/10 bg-[#131926] p-0.5 shadow-md transition-transform duration-200 group-hover:scale-105">
          <Image
            src="/logo.jpeg"
            alt="Nexora Logo"
            width={dimensions.img}
            height={dimensions.img}
            className="rounded-md object-contain hover:drop-shadow-[0_0_12px_rgba(56,189,248,0.45)]"
            priority
          />
        </div>
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
