'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CheckSquare,
  Network,
  HelpCircle,
} from 'lucide-react';
import { NexoraLogo } from '../brand/NexoraLogo';
import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

export const GlobalNavbar: React.FC = () => {
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();
  const [isOrientationCompleted, setIsOrientationCompleted] = useState<boolean>(false);

  const isTasks = pathname === '/tasks';
  const isCanvas = pathname.startsWith('/canvas');

  useEffect(() => {
    const checkStatus = () => {
      if (typeof window !== 'undefined') {
        const local =
          localStorage.getItem('nexora_orientation_completed') === 'true' ||
          localStorage.getItem('nexora_onboarding_completed_v1') === 'true';
        const userCompleted = Boolean(
          (session?.user as { onboardingCompleted?: boolean })?.onboardingCompleted
        );
        setIsOrientationCompleted(local || userCompleted);
      }
    };

    checkStatus();

    const handleCompletedEvent = () => {
      setIsOrientationCompleted(true);
    };

    window.addEventListener('nexora:orientation-completed', handleCompletedEvent);
    return () => {
      window.removeEventListener('nexora:orientation-completed', handleCompletedEvent);
    };
  }, [session]);

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
          <NexoraLogo size="md" href="/" />

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

        {/* Right: Quick Actions & Auth */}
        <div className="flex items-center gap-2.5">
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

          {/* Tutorial / Help Trigger — only rendered when session is confirmed and not completed */}
          {!isPending && !isOrientationCompleted && (
            <>
              <button
                type="button"
                onClick={handleRestartTutorial}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#131926] px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-300 transition-all hover:border-cyan-500/30 hover:bg-cyan-500/10 hover:text-cyan-300 active:scale-95 animate-in fade-in duration-150"
                title="Interactive Orientation Tutorial"
              >
                <HelpCircle className="h-3.5 w-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Orientation</span>
              </button>

              <div className="h-5 w-px bg-white/10 hidden sm:block" />
            </>
          )}

          {/* Direct Auth Controls with Pending Skeleton Guard */}
          {isPending ? (
            <div className="flex items-center gap-2.5 px-2">
              <div className="h-8 w-8 rounded-full bg-white/10 border border-white/5 animate-pulse" />
              <div className="hidden md:block h-3.5 w-16 rounded-md bg-white/10 animate-pulse" />
            </div>
          ) : session?.user ? (
            <div className="flex items-center gap-3 animate-in fade-in duration-150">
              {session.user.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || 'Avatar'}
                  className="w-8 h-8 rounded-full border border-slate-700 object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-bold text-cyan-300 border border-cyan-500/30">
                  {session.user.name?.charAt(0) || 'U'}
                </div>
              )}
              <span className="text-xs text-slate-300 hidden md:inline font-medium">{session.user.name}</span>
              <button
                type="button"
                onClick={() => authClient.signOut()}
                className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors active:scale-95"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => authClient.signIn.social({ provider: 'google', callbackURL: '/' })}
              className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow transition-colors active:scale-95 animate-in fade-in duration-150"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Sign in with Google</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
