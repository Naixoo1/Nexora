'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  CheckSquare,
  Network,
  HelpCircle,
  LogIn,
  LogOut,
  User,
  Loader2,
} from 'lucide-react';
import { NexoraLogo } from '../brand/NexoraLogo';
import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

export const GlobalNavbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const isTasks = pathname === '/tasks';
  const isCanvas = pathname.startsWith('/canvas');

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: pathname || '/',
      });
    } catch (err) {
      console.error('Sign-in failed:', err);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await authClient.signOut();
      router.refresh();
    } catch (err) {
      console.error('Sign-out failed:', err);
    } finally {
      setIsSigningOut(false);
    }
  };

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

          {/* Tutorial / Help Trigger */}
          <button
            type="button"
            onClick={handleRestartTutorial}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#131926] px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-300 transition-all hover:border-cyan-500/30 hover:bg-cyan-500/10 hover:text-cyan-300 active:scale-95"
            title="Restart Interactive Orientation Tutorial"
          >
            <HelpCircle className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Orientation</span>
          </button>

          <div className="h-5 w-px bg-white/10 hidden sm:block" />

          {/* Auth State Component */}
          {isPending ? (
            <div className="flex h-8 items-center gap-1.5 rounded-xl border border-white/10 bg-[#131926] px-3 text-xs text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
              <span className="hidden sm:inline">Checking auth...</span>
            </div>
          ) : session?.user ? (
            /* Logged-In State */
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#131926] px-2.5 py-1 text-xs text-slate-200">
                {session.user.image ? (
                  <Image
                    src={session.user.image}
                    alt={session.user.name || 'User avatar'}
                    width={20}
                    height={20}
                    className="h-5 w-5 rounded-full object-cover ring-1 ring-cyan-400/40"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 text-[10px] font-bold text-white">
                    {session.user.name ? session.user.name.charAt(0).toUpperCase() : <User className="h-3 w-3" />}
                  </div>
                )}
                <span className="hidden max-w-[120px] truncate font-medium sm:inline">
                  {session.user.name || session.user.email}
                </span>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#131926] px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-400 transition-all hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300 active:scale-95 disabled:opacity-50"
                title="Sign out of Nexora"
              >
                {isSigningOut ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <LogOut className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            /* Logged-Out State: Sign in with Google */
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400 px-3.5 py-1.5 text-xs font-semibold text-white shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all hover:opacity-95 active:scale-95 disabled:opacity-50"
              title="Sign in with your Google account"
            >
              {isSigningIn ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
              ) : (
                <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              )}
              <span>Sign in with Google</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
