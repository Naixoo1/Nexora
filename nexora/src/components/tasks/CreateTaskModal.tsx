'use client';

import React, { useState } from 'react';
import {
  X,
  Calendar,
  Tag,
  AlertCircle,
  Plus,
  Edit3,
  Loader2,
  GitBranch,
  LogIn,
} from 'lucide-react';
import { useTaskStore } from '@/stores/useTaskStore';
import { authClient } from '@/lib/auth-client';
import type { TaskPriority, CreateTaskPayload, UpdateTaskPayload, Task } from '@/types/task';
import { cn } from '@/lib/utils';

interface CreateTaskFormContentProps {
  editingTask: Task | null;
  parentTask: Task | null;
  parentTaskId: string | null;
  isCreating: boolean;
  storeError: string | null;
  onClose: () => void;
  onSubmitCreate: (payload: CreateTaskPayload) => Promise<boolean>;
  onSubmitUpdate: (id: string, payload: UpdateTaskPayload) => Promise<boolean>;
  clearStoreError: () => void;
}

const CreateTaskFormContent: React.FC<CreateTaskFormContentProps> = ({
  editingTask,
  parentTask,
  parentTaskId,
  isCreating,
  storeError,
  onClose,
  onSubmitCreate,
  onSubmitUpdate,
  clearStoreError,
}) => {
  const { data: session, isPending: isAuthPending } = authClient.useSession();
  const [title, setTitle] = useState(editingTask?.title ?? '');
  const [description, setDescription] = useState(editingTask?.description ?? '');
  const [priority, setPriority] = useState<TaskPriority>(editingTask?.priority ?? 'medium');
  const [category, setCategory] = useState(editingTask?.category ?? '');
  const [dueDate, setDueDate] = useState(
    editingTask?.dueDate
      ? new Date(editingTask.dueDate).toISOString().split('T')[0]
      : ''
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: typeof window !== 'undefined' ? window.location.pathname : '/tasks',
      });
    } catch (err) {
      console.error('Sign-in failed:', err);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) {
      setLocalError('Please sign in with Google to save tasks to your account.');
      return;
    }

    if (!title.trim()) {
      setLocalError('Please enter a task title.');
      return;
    }

    setLocalError(null);
    clearStoreError();

    if (editingTask) {
      const payload: UpdateTaskPayload = {
        title: title.trim(),
        description: description.trim() || null,
        priority,
        category: category.trim() || null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      };

      const success = await onSubmitUpdate(editingTask.id, payload);
      if (success) {
        onClose();
      }
    } else {
      const payload: CreateTaskPayload = {
        title: title.trim(),
        description: description.trim() || undefined,
        parentId: parentTaskId || undefined,
        priority,
        category: category.trim() || undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        source: 'manual',
      };

      const success = await onSubmitCreate(payload);
      if (success) {
        onClose();
      }
    }
  };

  const isAuthenticated = Boolean(session?.user);

  return (
    <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#131926] p-6 sm:p-7 shadow-2xl transition-all">
      {/* Close Button */}
      <button
        type="button"
        disabled={isCreating}
        onClick={onClose}
        className="absolute right-5 top-5 rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Modal Title */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20">
          {editingTask ? <Edit3 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">
            {editingTask
              ? 'Edit Task'
              : parentTask
              ? 'Add Sub-task'
              : 'Create New Task'}
          </h3>
          <p className="text-xs text-slate-400">
            {editingTask
              ? 'Modify task parameters and deadlines'
              : parentTask
              ? `Hierarchical child of: "${parentTask.title}"`
              : 'Define study milestones and actionable items'}
          </p>
        </div>
      </div>

      {/* Auth Guard Banner if not logged in */}
      {!isAuthPending && !isAuthenticated && (
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 p-3.5 text-xs text-indigo-200">
          <div className="flex items-center gap-2">
            <LogIn className="h-4 w-4 shrink-0 text-indigo-400" />
            <span>Sign in with Google required to save tasks to your database.</span>
          </div>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 font-semibold text-white shadow transition-all hover:bg-indigo-500 active:scale-95 shrink-0"
          >
            {isSigningIn ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            <span>Sign in</span>
          </button>
        </div>
      )}

      {/* Parent Task Context Banner if creating subtask */}
      {parentTask && !editingTask && (
        <div className="mt-3.5 flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-2.5 text-xs text-cyan-300">
          <GitBranch className="h-4 w-4 shrink-0 text-cyan-400" />
          <span className="truncate">
            Sub-task of: <strong className="font-semibold text-white">{parentTask.title}</strong>
          </span>
        </div>
      )}

      {/* Error Alert */}
      {(storeError || localError) && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{localError || storeError}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
            Task Title <span className="text-cyan-400">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Kerjakan Latihan Soal Try Out Matematika Bab 4..."
            className="w-full rounded-xl border border-white/10 bg-[#0B0F17] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
            disabled={isCreating}
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
            Description (Optional)
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tambahkan catatan khusus, referensi bab, atau rumus..."
            className="w-full rounded-xl border border-white/10 bg-[#0B0F17] p-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            disabled={isCreating}
          />
        </div>

        {/* Priority Selection */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
            Priority
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(
              [
                { id: 'low', label: 'Low', color: 'border-cyan-500/30 text-cyan-400' },
                { id: 'medium', label: 'Medium', color: 'border-indigo-500/30 text-indigo-400' },
                { id: 'high', label: 'High', color: 'border-amber-500/30 text-amber-400' },
                { id: 'urgent', label: 'Urgent', color: 'border-red-500/30 text-red-400' },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPriority(p.id)}
                className={cn(
                  'rounded-xl border py-2 text-xs font-semibold uppercase tracking-wider transition-all',
                  priority === p.id
                    ? cn('bg-[#1E2638] shadow-sm', p.color)
                    : 'border-white/5 bg-[#0B0F17] text-slate-400 hover:bg-[#1A2234]'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category & Due Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1">
              <Tag className="h-3.5 w-3.5 text-slate-400" />
              Category
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Matematika, Fisika, Skripsi"
              className="w-full rounded-xl border border-white/10 bg-[#0B0F17] px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              disabled={isCreating}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#0B0F17] px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none [color-scheme:dark]"
              disabled={isCreating}
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          {!isAuthenticated ? (
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white shadow-lg bg-indigo-600 hover:bg-indigo-500 transition-all"
            >
              {isSigningIn ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <LogIn className="h-4 w-4 text-white" />
              )}
              <span>Sign in with Google to Save</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={isCreating}
              className={cn(
                'w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white shadow-lg transition-all',
                'bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99]',
                isCreating && 'opacity-70 cursor-wait'
              )}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{editingTask ? 'Update Task' : 'Create Task'}</span>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export const CreateTaskModal: React.FC = () => {
  const {
    isCreateModalOpen,
    parentTaskIdForNewSubtask,
    editingTask,
    tasks,
    isCreating,
    error,
    openCreateModal,
    createTask,
    updateTask,
    clearError,
  } = useTaskStore();

  if (!isCreateModalOpen) return null;

  const parentTask = parentTaskIdForNewSubtask
    ? tasks.find((t) => t.id === parentTaskIdForNewSubtask) ?? null
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Frosted Glass Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity"
        onClick={() => !isCreating && openCreateModal(false)}
      />

      <CreateTaskFormContent
        key={editingTask?.id ?? parentTaskIdForNewSubtask ?? 'new'}
        editingTask={editingTask}
        parentTask={parentTask}
        parentTaskId={parentTaskIdForNewSubtask}
        isCreating={isCreating}
        storeError={error}
        onClose={() => openCreateModal(false)}
        onSubmitCreate={createTask}
        onSubmitUpdate={updateTask}
        clearStoreError={clearError}
      />
    </div>
  );
};
