'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Brain,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  MoreVertical,
  Network,
} from 'lucide-react';
import type { Task, TaskWithChildren, TaskStatus, TaskPriority } from '@/types/task';
import { formatRelativeDeadline } from '@/types/planner';
import { cn, isOverdue } from '@/lib/utils';
import { MAX_ALLOWED_DEPTH } from '@/stores/useTaskStore';

export interface TaskCardProps {
  task: TaskWithChildren;
  depth?: number;
  isExpanded?: boolean;
  onToggleExpand?: (taskId: string) => void;
  onToggleStatus: (taskId: string, currentStatus: TaskStatus) => void;
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
  onAddSubtask?: (parentId: string) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

const PRIORITY_CONFIG: Record<
  TaskPriority,
  { label: string; bg: string; text: string; border: string; glow: string }
> = {
  urgent: {
    label: 'Urgent',
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/30',
    glow: 'shadow-[0_0_12px_rgba(239,68,68,0.2)]',
  },
  high: {
    label: 'High',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    glow: '',
  },
  medium: {
    label: 'Medium',
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-400',
    border: 'border-indigo-500/30',
    glow: '',
  },
  low: {
    label: 'Low',
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
    glow: '',
  },
};

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; badgeBg: string; badgeText: string; ringColor: string }
> = {
  todo: {
    label: 'To Do',
    badgeBg: 'bg-slate-800/80',
    badgeText: 'text-slate-300',
    ringColor: 'border-slate-500 hover:border-indigo-400',
  },
  in_progress: {
    label: 'In Progress',
    badgeBg: 'bg-indigo-500/20',
    badgeText: 'text-indigo-300',
    ringColor: 'border-indigo-400 ring-2 ring-indigo-400/20',
  },
  completed: {
    label: 'Completed',
    badgeBg: 'bg-emerald-500/20',
    badgeText: 'text-emerald-300',
    ringColor: 'border-emerald-500 bg-emerald-500/20 text-emerald-400',
  },
  cancelled: {
    label: 'Cancelled',
    badgeBg: 'bg-rose-500/20',
    badgeText: 'text-rose-400',
    ringColor: 'border-rose-500',
  },
};

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  depth = 0,
  isExpanded = true,
  onToggleExpand,
  onToggleStatus,
  onStatusChange,
  onAddSubtask,
  onEditTask,
  onDeleteTask,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const hasChildren = task.children && task.children.length > 0;
  const isComplete = task.status === 'completed';
  const overdue = task.dueDate && !isComplete && isOverdue(task.dueDate);
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const statusInfo = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;

  // Subtask progress calculation
  const completedSubtasks = hasChildren
    ? task.children.filter((c) => c.status === 'completed').length
    : 0;

  // Can add subtasks if depth is strictly less than MAX_ALLOWED_DEPTH - 1 (depth 0 or depth 1)
  const canAddSubtask = depth < MAX_ALLOWED_DEPTH - 1;

  return (
    <div
      className={cn(
        'group relative rounded-xl border transition-all duration-200',
        'bg-[#131926] hover:bg-[#1A2234]',
        isComplete
          ? 'border-white/5 opacity-75'
          : 'border-white/10 hover:border-indigo-500/40 hover:shadow-[0_4px_20px_rgba(99,102,241,0.08)]',
        depth === 1 && 'ml-4 sm:ml-7 border-l-2 border-l-cyan-500/40',
        depth === 2 && 'ml-8 sm:ml-14 border-l-2 border-l-indigo-500/40'
      )}
    >
      <div className="flex items-start gap-3.5 p-3.5 sm:p-4">
        {/* Expand / Collapse Chevron if has subtasks */}
        <div className="pt-0.5">
          {hasChildren ? (
            <button
              type="button"
              onClick={() => onToggleExpand?.(task.id)}
              className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
              title={isExpanded ? 'Collapse subtasks' : 'Expand subtasks'}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-cyan-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-400" />
              )}
            </button>
          ) : (
            <div className="h-6 w-6" />
          )}
        </div>

        {/* Quick Status Toggle Button */}
        <button
          type="button"
          onClick={() => onToggleStatus(task.id, task.status)}
          className={cn(
            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all',
            isComplete
              ? 'border-emerald-500 bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]'
              : 'border-slate-500/70 bg-transparent hover:border-cyan-400 hover:bg-cyan-500/10 text-transparent'
          )}
          title={isComplete ? 'Mark as incomplete' : 'Mark as completed'}
        >
          <CheckCircle2 className="h-4 w-4" />
        </button>

        {/* Task Details */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* Title */}
            <h4
              className={cn(
                'text-sm sm:text-base font-semibold leading-snug tracking-tight text-white transition-all',
                isComplete && 'line-through text-slate-500'
              )}
            >
              {task.title}
            </h4>

            {/* Source Badge */}
            {task.source === 'ai_planner' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 px-2 py-0.5 text-[11px] font-medium text-cyan-300 border border-cyan-500/30">
                <Sparkles className="h-3 w-3 text-cyan-400" />
                AI Planner
              </span>
            )}
            {task.source === 'ai_brainstorm' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-cyan-950/40 px-2 py-0.5 text-[11px] font-medium text-cyan-400 border border-cyan-500/20">
                <Brain className="h-3 w-3" />
                Brainstorm
              </span>
            )}
            {task.source === 'canvas_export' && (
              <Link
                href={`/canvas?nodeId=${task.canvasNodeId || ''}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-cyan-950/50 to-indigo-950/50 px-2 py-0.5 text-[11px] font-medium text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20 hover:border-cyan-400 transition-colors"
                title="Exported from STEM Canvas. Click to open in canvas studio."
              >
                <Network className="h-3 w-3 text-cyan-400" />
                STEM Canvas Origin
              </Link>
            )}

            {/* Category Tag */}
            {task.category && (
              <span className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] font-medium text-slate-300 border border-white/5">
                {task.category}
              </span>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <p
              className={cn(
                'mt-1 text-xs sm:text-sm text-slate-400 line-clamp-2',
                isComplete && 'text-slate-600'
              )}
            >
              {task.description}
            </p>
          )}

          {/* Metadata Row */}
          <div className="mt-2.5 flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
            {/* Priority Indicator */}
            <span
              className={cn(
                'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider border',
                priority.bg,
                priority.text,
                priority.border,
                priority.glow
              )}
            >
              {priority.label}
            </span>

            {/* Status Pill */}
            <span
              className={cn(
                'rounded-md px-2 py-0.5 text-[11px] font-medium border border-white/5',
                statusInfo.badgeBg,
                statusInfo.badgeText
              )}
            >
              {statusInfo.label}
            </span>

            {/* Due Date Indicator */}
            {task.dueDate && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 font-mono text-[11px] rounded-md px-2 py-0.5 border',
                  overdue
                    ? 'border-red-500/40 bg-red-500/10 text-red-400 font-medium'
                    : 'border-cyan-500/20 bg-cyan-950/30 text-cyan-300'
                )}
              >
                {overdue ? (
                  <AlertCircle className="h-3 w-3 text-red-400 shrink-0" />
                ) : (
                  <Calendar className="h-3 w-3 text-cyan-400 shrink-0" />
                )}
                <span>{formatRelativeDeadline(task.dueDate)}</span>
              </span>
            )}

            {/* Subtasks Count Badge */}
            {hasChildren && (
              <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-slate-300 font-mono border border-white/5">
                <Clock className="h-3 w-3 text-cyan-400" />
                {completedSubtasks}/{task.children.length} sub-tasks
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="relative flex items-center gap-1">
          {/* Quick Add Subtask Button (Depth < 2) */}
          {canAddSubtask && (
            <button
              type="button"
              onClick={() => onAddSubtask?.(task.id)}
              className="flex h-7 items-center gap-1 rounded-lg bg-indigo-500/10 px-2 text-xs font-medium text-indigo-300 transition-all hover:bg-indigo-500/20 hover:text-white border border-indigo-500/20"
              title="Add Sub-task (Max 3 levels)"
            >
              <Plus className="h-3.5 w-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Sub-task</span>
            </button>
          )}

          {/* Context Menu Toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
              title="More actions"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-8 z-20 w-44 rounded-xl border border-white/10 bg-[#131926] p-1.5 shadow-xl backdrop-blur-md">
                  {onStatusChange && (
                    <div className="mb-1 border-b border-white/10 pb-1">
                      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Set Status
                      </div>
                      {(['todo', 'in_progress', 'completed', 'cancelled'] as TaskStatus[]).map(
                        (status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => {
                              onStatusChange(task.id, status);
                              setShowMenu(false);
                            }}
                            className={cn(
                              'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors',
                              task.status === status
                                ? 'bg-indigo-600/30 text-indigo-300 font-medium'
                                : 'text-slate-300 hover:bg-white/10 hover:text-white'
                            )}
                          >
                            <Circle
                              className={cn(
                                'h-2.5 w-2.5',
                                status === 'completed' && 'fill-emerald-400 text-emerald-400',
                                status === 'in_progress' && 'fill-indigo-400 text-indigo-400',
                                status === 'cancelled' && 'fill-rose-400 text-rose-400',
                                status === 'todo' && 'text-slate-500'
                              )}
                            />
                            {STATUS_CONFIG[status].label}
                          </button>
                        )
                      )}
                    </div>
                  )}

                  {onEditTask && (
                    <button
                      type="button"
                      onClick={() => {
                        onEditTask(task);
                        setShowMenu(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-slate-400" />
                      Edit Task
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      onDeleteTask(task.id);
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-rose-400 transition-colors hover:bg-rose-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Task
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
