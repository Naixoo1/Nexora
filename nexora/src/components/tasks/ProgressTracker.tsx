'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Play,
  Pause,
  XCircle,
  Sparkles,
  Flame,
  BrainCircuit,
  Award,
} from 'lucide-react';
import { useTaskStore } from '@/stores/useTaskStore';
import type { ProgressStatus } from '@/types/task';
import { cn } from '@/lib/utils';

export const ProgressTracker: React.FC = () => {
  const {
    activeProgressSnapshot,
    toggleProgressTarget,
    cancelProgressSnapshot,
    updateProgressStatus,
    openPlannerModal,
  } = useTaskStore();

  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);

  // Clean empty state when no active session is loaded
  if (!activeProgressSnapshot) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#131926] p-5 sm:p-6 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
            <BrainCircuit className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">AI Progress Tracker</h3>
            <p className="text-xs text-slate-400">Live milestone verification</p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-dashed border-white/10 bg-[#0B0F17]/60 p-5 text-center">
          <Sparkles className="mx-auto h-6 w-6 text-cyan-400 opacity-80" />
          <p className="mt-2 text-xs leading-relaxed text-slate-300">
            No active tracking session. Start a task or generate a study plan to track live milestones.
          </p>
          <button
            type="button"
            onClick={() => openPlannerModal(true)}
            className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-500 px-3.5 py-2 text-xs font-semibold text-white shadow-md transition-all hover:opacity-95 active:scale-95"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Generate Study Plan</span>
          </button>
        </div>
      </div>
    );
  }

  const { targets, totalSteps, completedSteps, status } = activeProgressSnapshot;
  const percentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const isCompleted = status === 'completed' || percentage === 100;
  const isCancelled = status === 'cancelled';
  const isPaused = status === 'paused';

  const handleToggleStatus = () => {
    if (isCancelled || isCompleted) return;
    const nextStatus: ProgressStatus = isPaused ? 'active' : 'paused';
    updateProgressStatus(activeProgressSnapshot.id, nextStatus);
  };

  const handleCancel = () => {
    cancelProgressSnapshot(activeProgressSnapshot.id);
    setIsConfirmingCancel(false);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#131926] p-5 sm:p-6 shadow-xl backdrop-blur-md transition-all">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 text-cyan-300 ring-1 ring-cyan-400/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-white">AI Progress Tracker</h3>
            <p className="text-xs text-slate-400">Live milestone verification</p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          {status === 'active' && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-2.5 py-1 text-xs font-medium text-cyan-300 border border-cyan-500/30">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500"></span>
              </span>
              Active
            </span>
          )}
          {status === 'paused' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400 border border-amber-500/30">
              <Pause className="h-3 w-3" />
              Paused
            </span>
          )}
          {status === 'completed' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/30">
              <Award className="h-3 w-3" />
              Done
            </span>
          )}
          {status === 'cancelled' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-400 border border-rose-500/30">
              <XCircle className="h-3 w-3" />
              Cancelled
            </span>
          )}
        </div>
      </div>

      {/* Dynamic Progress Bar & Percentage */}
      <div className="mt-5 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-slate-300 flex items-center gap-1">
            <Flame className="h-3.5 w-3.5 text-amber-400" />
            Milestone Completion
          </span>
          <span className="font-mono font-semibold text-cyan-300">{percentage}%</span>
        </div>

        {/* Gradient Progress Bar */}
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-[#0B0F17]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-sky-400 to-teal-400 transition-all duration-500 ease-out shadow-[0_0_12px_rgba(6,182,212,0.3)]"
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>

        <div className="flex justify-between text-[11px] font-mono text-slate-400">
          <span>
            {completedSteps} of {totalSteps} targets reached
          </span>
          <span>{totalSteps - completedSteps} remaining</span>
        </div>
      </div>

      {/* Target Checklist */}
      <div className="mt-4 space-y-2">
        {targets.map((target, idx) => (
          <div
            key={idx}
            onClick={() => !isCancelled && toggleProgressTarget(idx)}
            className={cn(
              'group flex items-start gap-2.5 rounded-xl border p-2.5 text-xs transition-all cursor-pointer select-none',
              target.completed
                ? 'border-emerald-500/20 bg-emerald-500/5 text-slate-300'
                : 'border-white/5 bg-[#0B0F17]/50 text-slate-400 hover:border-cyan-500/30 hover:bg-[#1A2234]',
              isCancelled && 'opacity-60 cursor-not-allowed'
            )}
          >
            <div className="mt-0.5 shrink-0">
              {target.completed ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <Circle className="h-4 w-4 text-slate-500 group-hover:text-cyan-400" />
              )}
            </div>
            <span
              className={cn(
                'flex-1 leading-relaxed',
                target.completed && 'line-through text-slate-500'
              )}
            >
              {target.label}
            </span>
          </div>
        ))}
      </div>

      {/* Session Controls */}
      <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
        {!isCancelled && !isCompleted ? (
          <>
            {/* Pause / Resume button */}
            <button
              type="button"
              onClick={handleToggleStatus}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors border',
                isPaused
                  ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              )}
            >
              {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              {isPaused ? 'Resume Session' : 'Pause Session'}
            </button>

            {/* Cancel Control */}
            {isConfirmingCancel ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-rose-300">Cancel session?</span>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-lg bg-rose-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-rose-500"
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmingCancel(false)}
                  className="rounded-lg bg-white/10 px-2 py-1 text-[11px] text-slate-300 hover:bg-white/20"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsConfirmingCancel(true)}
                className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300"
              >
                <XCircle className="h-3.5 w-3.5" />
                Cancel Session
              </button>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={() => openPlannerModal(true)}
            className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Generate New Study Plan</span>
          </button>
        )}
      </div>
    </div>
  );
};
