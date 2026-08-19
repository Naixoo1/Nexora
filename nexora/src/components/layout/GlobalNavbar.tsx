'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CheckSquare,
  Network,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { NexoraLogo } from '../brand/NexoraLogo';
import { cn } from '@/lib/utils';

export const GlobalNavbar: React.FC = () => {
  const pathname = usePathname();

  const isTasks = pathname === '/tasks';
  const isCanvas = pathname.startsWith('/canvas');

  const handleRestartTutorial = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nexora:restart-onboarding'));
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#0B0F17]/90 backdrop-blur-xl transition-all">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand Logo */}
        <div className="flex items-center gap-6">
          <NexoraLogo size="md" />

          {/* Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/tasks"
              className={cn(
                'flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all',
                isTasks
                  ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/15'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              )}
            >
              <CheckSquare className={cn('h-3.5 w-3.5', isTasks ? 'text-cyan-400' : 'text-slate-400')} />
              <span>Study Planner & Tasks</span>
            </Link>

            <Link
              href="/canvas"
              className={cn(
                'flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all',
                isCanvas
                  ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/15'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              )}
            >
              <Network className={cn('h-3.5 w-3.5', isCanvas ? 'text-cyan-400' : 'text-slate-400')} />
              <span>STEM Logic Canvas</span>
            </Link>
          </nav>
        </div>

        {/* Right: Quick Actions */}
        <div className="flex items-center gap-2">
          {/* Mobile nav quick links */}
          <div className="flex md:hidden items-center gap-1">
            <Link
              href="/tasks"
              className={cn(
                'rounded-lg p-2 transition-all',
                isTasks ? 'bg-white/10 text-cyan-300' : 'text-slate-400'
              )}
              title="Tasks"
            >
              <CheckSquare className="h-4 w-4" />
            </Link>
            <Link
              href="/canvas"
              className={cn(
                'rounded-lg p-2 transition-all',
                isCanvas ? 'bg-white/10 text-cyan-300' : 'text-slate-400'
              )}
              title="STEM Canvas"
            >
              <Network className="h-4 w-4" />
            </Link>
          </div>

          {/* Tutorial / Help Trigger */}
          <button
            type="button"
            onClick={handleRestartTutorial}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#131926] px-3 py-1.5 text-xs font-medium text-slate-300 transition-all hover:border-cyan-500/30 hover:bg-cyan-500/10 hover:text-cyan-300 active:scale-95"
            title="Restart Interactive Orientation Tutorial"
          >
            <HelpCircle className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Orientation</span>
          </button>
        </div>
      </div>
    </header>
  );
};
