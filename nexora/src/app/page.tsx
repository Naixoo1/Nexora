'use client';

import React from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  Network,
  CheckSquare,
  Brain,
  Layers,
} from 'lucide-react';
import { GlobalNavbar } from '@/components/layout/GlobalNavbar';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0B0F17] text-[#F1F5F9] antialiased flex flex-col justify-between">
      {/* Background Ambient Glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-indigo-600/15 blur-[128px]" />
        <div className="absolute top-1/3 right-1/4 h-[400px] w-[400px] rounded-full bg-cyan-500/10 blur-[128px]" />
        <div className="absolute -bottom-20 left-1/3 h-[450px] w-[450px] rounded-full bg-purple-600/10 blur-[128px]" />
      </div>

      {/* Top Header Navigation — contains auth sign-in/sign-out */}
      <GlobalNavbar />

      {/* Hero Section */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8 flex-1 flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-semibold text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <span>AI Academic Companion for High School & University</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Master complex derivations with{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-300 to-teal-300">
              Interactive AI Logic Trees
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Deconstruct advanced mathematics and physics into verifiable DAG proof trees. Transform derivations into study tasks and brainstorm with multimodal voice AI tutors.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              href="/tasks"
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400 px-6 py-3.5 text-sm font-bold text-white shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all hover:opacity-95 active:scale-95"
            >
              <CheckSquare className="h-4 w-4" />
              <span>Study Planner & Tasks</span>
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>

            <Link
              href="/canvas"
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#131926] px-6 py-3.5 text-sm font-bold text-white transition-all hover:border-cyan-500/40 hover:bg-cyan-950/20 hover:text-cyan-300 active:scale-95 shadow-md"
            >
              <Network className="h-4 w-4 text-cyan-400" />
              <span>STEM Logic Canvas</span>
            </Link>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="mt-16 sm:mt-24 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-[#131926]/80 p-6 shadow-xl backdrop-blur-md transition-all hover:border-cyan-500/30">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 text-white shadow-md">
              <Network className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-bold text-white">STEM Logic Trees</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Step-by-step mathematical expansions with live KaTeX formulas, dynamic parameter sliders, and rule verification.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#131926]/80 p-6 shadow-xl backdrop-blur-md transition-all hover:border-indigo-500/30">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-bold text-white">AI Study Planner</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Synthesize UTBK, semester exam, and thesis roadmaps into hierarchical tasks with estimated completion dates.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#131926]/80 p-6 shadow-xl backdrop-blur-md transition-all hover:border-cyan-500/30">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Brain className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-bold text-white">Multimodal Tutor</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Brainstorm with voice dictation, attach textbook photos, and explore Olympiad or Socratic pedagogical reasoning.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#131926]/80 p-6 shadow-xl backdrop-blur-md transition-all hover:border-teal-500/30">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <Layers className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-bold text-white">Canvas & Task Sync</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Convert difficult derivation steps or theorem proof nodes into tracked study subtasks with a single click.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#0B0F17] py-6 text-center text-xs text-slate-500">
        <p>Nexora &bull; AI-Powered Academic Assistant for High School & University Students</p>
      </footer>

      {/* Interactive Orientation Modal */}
      <OnboardingModal />
    </div>
  );
}
