'use client';

import React, { useEffect } from 'react';
import {
  Sparkles,
  Plus,
  CheckCircle2,
  Clock,
  ListTodo,
  TrendingUp,
  BookOpen,
  Zap,
} from 'lucide-react';
import { useTaskStore } from '@/stores/useTaskStore';
import { useChatStore } from '@/stores/useChatStore';
import { authClient } from '@/lib/auth-client';
import { TaskList } from '@/components/tasks/TaskList';
import { ProgressTracker } from '@/components/tasks/ProgressTracker';
import { StudyPlannerModal } from '@/components/tasks/StudyPlannerModal';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { ChatDrawer } from '@/components/chat/ChatDrawer';
import { FloatingBrainstormButton } from '@/components/chat/FloatingBrainstormButton';
import { GlobalNavbar } from '@/components/layout/GlobalNavbar';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';
import { useTranslation } from '@/hooks/useTranslation';
import type { TaskContextSnapshot } from '@/types/chat';

export default function TasksPage() {
  const { t } = useTranslation();
  const { data: session } = authClient.useSession();
  const { tasks, fetchTasks, openPlannerModal, openCreateModal } = useTaskStore();
  const { openDrawer, setTaskContext } = useChatStore();

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks, session]);

  // Statistics
  const totalTasks = tasks.length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const completionRate = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  // Handle open brainstorm drawer with context
  const handleOpenBrainstorm = () => {
    // If there is an active / in_progress task, create a task context snapshot
    const activeTask = tasks.find((t) => t.status === 'in_progress') || tasks[0];
    if (activeTask) {
      const subtasks = tasks.filter((t) => t.parentId === activeTask.id);
      const completedSubtasks = subtasks.filter((t) => t.status === 'completed');

      const snapshot: TaskContextSnapshot = {
        taskId: activeTask.id,
        title: activeTask.title,
        description: activeTask.description,
        status: activeTask.status,
        priority: activeTask.priority,
        category: activeTask.category,
        dueDate: activeTask.dueDate ? new Date(activeTask.dueDate).toISOString() : null,
        isOverdue: activeTask.dueDate ? new Date(activeTask.dueDate).getTime() < Date.now() : false,
        subtaskCount: subtasks.length,
        completedSubtaskCount: completedSubtasks.length,
        milestoneProgressPct: subtasks.length > 0 ? Math.round((completedSubtasks.length / subtasks.length) * 100) : 0,
      };

      setTaskContext(snapshot);
      openDrawer({ taskContext: snapshot });
    } else {
      openDrawer();
    }
  };

  return (
    <main className="min-h-screen bg-[#0B0F17] text-[#F1F5F9] antialiased">
      <GlobalNavbar />

      {/* Top Background Glow Elements */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="absolute top-20 right-1/4 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Navigation & Header */}
        <header className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{t('dashboard.badge')}</span>
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {t('dashboard.title')}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              {t('dashboard.subtitle')}
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => openPlannerModal(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-[0_0_20px_rgba(99,102,241,0.35)] transition-all hover:opacity-95 active:scale-95"
            >
              <Sparkles className="h-4 w-4" />
              <span>{t('dashboard.btnAiPlanner')}</span>
            </button>

            <button
              type="button"
              onClick={() => openCreateModal(true, null)}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#131926] px-4 py-2.5 text-xs sm:text-sm font-semibold text-white transition-all hover:bg-white/10 hover:border-white/20 active:scale-95"
            >
              <Plus className="h-4 w-4 text-cyan-400" />
              <span>{t('dashboard.btnNewTask')}</span>
            </button>
          </div>
        </header>

        {/* Stats Metric Cards Grid */}
        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {/* Total Tasks */}
          <div className="rounded-2xl border border-white/10 bg-[#131926] p-4 shadow-sm backdrop-blur-md">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">{t('dashboard.stats.totalTasks')}</span>
              <ListTodo className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-white">{totalTasks}</div>
            <div className="mt-1 text-[11px] text-slate-400">{t('dashboard.stats.totalTasksSub')}</div>
          </div>

          {/* In Progress */}
          <div className="rounded-2xl border border-white/10 bg-[#131926] p-4 shadow-sm backdrop-blur-md">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">{t('dashboard.stats.inProgress')}</span>
              <Clock className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-cyan-300">{inProgressCount}</div>
            <div className="mt-1 text-[11px] text-slate-400">{t('dashboard.stats.inProgressSub')}</div>
          </div>

          {/* Completed */}
          <div className="rounded-2xl border border-white/10 bg-[#131926] p-4 shadow-sm backdrop-blur-md">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">{t('dashboard.stats.completed')}</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-emerald-400">
              {completedCount}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">{t('dashboard.stats.completedSub')}</div>
          </div>

          {/* Completion Rate */}
          <div className="rounded-2xl border border-white/10 bg-[#131926] p-4 shadow-sm backdrop-blur-md">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">{t('dashboard.stats.progressRate')}</span>
              <TrendingUp className="h-4 w-4 text-amber-400" />
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-amber-300">
              {completionRate}%
            </div>
            <div className="mt-1 text-[11px] text-slate-400">{t('dashboard.stats.progressRateSub')}</div>
          </div>
        </section>

        {/* Main Content Workspace Layout */}
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Column: Task List Hierarchy (65% width on desktop -> 8 cols of 12) */}
          <div className="lg:col-span-8">
            <div className="rounded-2xl border border-white/10 bg-[#131926]/80 p-4 sm:p-6 shadow-xl backdrop-blur-md">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white">{t('dashboard.hierarchyTitle')}</h2>
                  <p className="text-xs text-slate-400">
                    {t('dashboard.hierarchySubtitle')}
                  </p>
                </div>
              </div>

              {/* TaskList Component */}
              <TaskList />
            </div>
          </div>

          {/* Right Column: AI Progress Tracker & Side Widgets (35% width on desktop -> 4 cols of 12) */}
          <div className="space-y-6 lg:col-span-4">
            {/* Live Progress Tracker Component */}
            <ProgressTracker />

            {/* Quick AI Study Planner Card */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-950/40 via-[#131926] to-cyan-950/30 p-5 sm:p-6 shadow-xl backdrop-blur-md">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
                <Zap className="h-4 w-4" />
                <span>{t('dashboard.acceleratorBadge')}</span>
              </div>
              <h3 className="mt-2 text-base font-bold text-white">
                {t('dashboard.acceleratorTitle')}
              </h3>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                {t('dashboard.acceleratorDesc')}
              </p>

              <button
                type="button"
                onClick={() => openPlannerModal(true)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 py-2.5 text-xs font-semibold text-white shadow-lg transition-all hover:opacity-90 active:scale-98"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{t('dashboard.btnLaunchPlanner')}</span>
              </button>
            </div>

            {/* Study Discipline & Tips Card */}
            <div className="rounded-2xl border border-white/10 bg-[#131926] p-5 shadow-xl backdrop-blur-md">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <BookOpen className="h-4 w-4 text-indigo-400" />
                <span>{t('dashboard.tipsTitle')}</span>
              </div>
              <ul className="mt-3 space-y-2.5 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <div className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  <span>{t('dashboard.tip1')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  <span>{t('dashboard.tip2')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>{t('dashboard.tip3')}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Mobile Bottom Action Bar (< 640px) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-white/10 bg-[#0B0F17]/90 px-4 py-3 backdrop-blur-lg sm:hidden">
        <button
          type="button"
          onClick={() => openCreateModal(true, null)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-[#131926] py-2.5 text-xs font-semibold text-white mr-2"
        >
          <Plus className="h-4 w-4 text-cyan-400" />
          <span>{t('dashboard.btnNewTask')}</span>
        </button>

        <button
          type="button"
          onClick={() => openPlannerModal(true)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 py-2.5 text-xs font-semibold text-white shadow-lg"
        >
          <Sparkles className="h-4 w-4" />
          <span>{t('dashboard.btnAiPlanner')}</span>
        </button>
      </div>

      {/* Floating Brainstorm Drawer Trigger */}
      <FloatingBrainstormButton onClickCustom={handleOpenBrainstorm} />

      {/* Modals, Tutorial & Slide-over Drawer */}
      <StudyPlannerModal />
      <CreateTaskModal />
      <ChatDrawer />
      <OnboardingModal />
    </main>
  );
}
