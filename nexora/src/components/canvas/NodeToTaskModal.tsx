'use client';

import React, { useState } from 'react';
import {
  CheckSquare,
  Sparkles,
  X,
  Calendar,
  Layers,
  AlertCircle,
  Loader2,
  Tag,
  Check,
  LogIn,
} from 'lucide-react';
import { useCanvasStore } from '@/stores/useCanvasStore';
import { useTaskStore } from '@/stores/useTaskStore';
import { authClient } from '@/lib/auth-client';
import { LatexRenderer } from './LatexRenderer';
import type { TaskPriority } from '@/types/task';
import type { NodeToTaskConvert } from '@/lib/validators/canvas-task';
import type { StemCanvasNode } from '@/types/canvas';
import { cn } from '@/lib/utils';

function formatNodeTypeLabel(nodeType?: string): string {
  switch (nodeType) {
    case 'problem_root':
      return 'Problem Root';
    case 'reasoning_step':
      return 'Derivation Step';
    case 'what_if_branch':
      return 'What-If Simulation';
    case 'theorem_proof':
      return 'Theorem / Proof';
    case 'formula_block':
      return 'Formula Block';
    default:
      return 'Canvas Node';
  }
}

interface NodeToTaskFormProps {
  canvasId: string;
  targetNode: StemCanvasNode;
  onClose: () => void;
}

const NodeToTaskForm: React.FC<NodeToTaskFormProps> = ({
  canvasId,
  targetNode,
  onClose,
}) => {
  const { data: session, isPending: isAuthPending } = authClient.useSession();
  const { isConvertingNodeToTask, convertNodeToTask } = useCanvasStore();
  const { tasks, fetchTasks } = useTaskStore();

  const nodeTypeLabel = formatNodeTypeLabel(
    targetNode.data.nodeType || targetNode.type
  );

  const [title, setTitle] = useState(
    () => `[${nodeTypeLabel}] ${targetNode.data.title || 'Untitled Node'}`
  );
  const [priority, setPriority] = useState<TaskPriority>(
    () => (targetNode.data.validationStatus === 'erroneous' ? 'high' : 'medium')
  );
  const [category, setCategory] = useState('Calculus & STEM');
  const [dueDate, setDueDate] = useState('');
  const [parentTaskId, setParentTaskId] = useState('');
  const [includeLatex, setIncludeLatex] = useState(true);
  const [includeVariables, setIncludeVariables] = useState(true);
  const [customDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: typeof window !== 'undefined' ? window.location.pathname : `/canvas/${canvasId}`,
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
      setError('Please sign in with Google to convert this node into a tracked task.');
      return;
    }

    if (!title.trim() || isConvertingNodeToTask) return;

    setError(null);

    const payload: NodeToTaskConvert = {
      title: title.trim(),
      priority,
      category: category.trim() || undefined,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      parentTaskId: parentTaskId || undefined,
      includeLatexInDescription: includeLatex,
      includeVariablesInDescription: includeVariables,
      description: customDescription.trim() || undefined,
    };

    const created = await convertNodeToTask(canvasId, targetNode.id, payload);

    if (created) {
      // Refresh task list in task store so task is immediately visible
      fetchTasks();
    } else {
      setError('Failed to create task from canvas node.');
    }
  };

  const isAuthenticated = Boolean(session?.user);

  const priorities: { id: TaskPriority; label: string; color: string }[] = [
    { id: 'low', label: 'Low', color: 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10' },
    { id: 'medium', label: 'Medium', color: 'border-indigo-500/30 text-indigo-400 bg-indigo-500/10' },
    { id: 'high', label: 'High', color: 'border-amber-500/30 text-amber-400 bg-amber-500/10' },
    { id: 'urgent', label: 'Urgent', color: 'border-rose-500/30 text-rose-400 bg-rose-500/10' },
  ];

  // Filter possible parent tasks to those that are root tasks or level 1 subtasks
  const eligibleParentTasks = tasks.filter(
    (t) => !t.parentId || tasks.some((p) => p.id === t.parentId && !p.parentId)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Frosted Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-[#131926] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-indigo-900/40 via-cyan-950/30 to-[#131926] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 text-white shadow-md">
              <CheckSquare className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Convert Node to Task</h3>
              <p className="text-xs text-cyan-400 font-mono">
                STEM Canvas Export &bull; {targetNode.data.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Auth Guard Banner if not logged in */}
        {!isAuthPending && !isAuthenticated && (
          <div className="mx-5 mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 p-3 text-xs text-cyan-200">
            <div className="flex items-center gap-2">
              <LogIn className="h-4 w-4 shrink-0 text-cyan-400" />
              <span>Sign in required to convert nodes into tracked tasks.</span>
            </div>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 px-3 py-1 font-semibold text-white shadow transition-all hover:opacity-90 active:scale-95 shrink-0"
            >
              {isSigningIn ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              <span>Sign in</span>
            </button>
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4 text-xs sm:text-sm">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Node Mathematical & Content Preview */}
          <div className="rounded-xl border border-white/10 bg-[#0B0F17] p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                Node Content & Math Formulation
              </span>
              <span className="text-cyan-400 font-mono">
                {formatNodeTypeLabel(targetNode.data.nodeType || targetNode.type)}
              </span>
            </div>

            {targetNode.data.latexFormula && (
              <div className="overflow-hidden rounded-lg bg-[#131926]/80 p-2">
                <LatexRenderer
                  latex={targetNode.data.latexFormula}
                  displayMode="block"
                  showCopyButton={false}
                />
              </div>
            )}

            {targetNode.data.variables && targetNode.data.variables.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {targetNode.data.variables.map((v) => (
                  <span
                    key={v.id}
                    className="inline-flex items-center gap-1 rounded-md border border-white/5 bg-[#131926] px-2 py-0.5 text-[11px] font-mono text-cyan-300"
                  >
                    <span className="text-slate-400">${v.symbol}$:</span>
                    <span className="font-bold text-white">{v.value}</span>
                    {v.unit && <span className="text-slate-500">{v.unit}</span>}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Task Title */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Task Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Master Chain Rule Derivation"
              className="w-full rounded-xl border border-white/10 bg-[#0B0F17] px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/30"
            />
          </div>

          {/* Priority Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Priority Level
            </label>
            <div className="grid grid-cols-4 gap-2">
              {priorities.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPriority(p.id)}
                  className={cn(
                    'flex items-center justify-center gap-1 rounded-xl border py-2 text-xs font-semibold transition-all',
                    p.color,
                    priority === p.id
                      ? 'ring-2 ring-white/20 shadow-md font-bold'
                      : 'opacity-60 hover:opacity-100'
                  )}
                >
                  {priority === p.id && <Check className="h-3 w-3" />}
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Category & Due Date Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Category
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Calculus, Physics"
                  className="w-full rounded-xl border border-white/10 bg-[#0B0F17] pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                />
                <Tag className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Target Due Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0B0F17] pl-8 pr-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
                />
                <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Parent Task Selector (Optional Nesting) */}
          {eligibleParentTasks.length > 0 && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Parent Task (Optional Hierarchy)
              </label>
              <div className="relative">
                <select
                  value={parentTaskId}
                  onChange={(e) => setParentTaskId(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0B0F17] pl-8 pr-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
                >
                  <option value="">-- Standalone Root Task --</option>
                  {eligibleParentTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
                <Layers className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Enrichment Checkboxes */}
          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={includeLatex}
                onChange={(e) => setIncludeLatex(e.target.checked)}
                className="rounded border-white/20 bg-[#0B0F17] text-cyan-400 focus:ring-0"
              />
              <span>Include Mathematical Formulation ($$) in task description</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={includeVariables}
                onChange={(e) => setIncludeVariables(e.target.checked)}
                className="rounded border-white/20 bg-[#0B0F17] text-cyan-400 focus:ring-0"
              />
              <span>Include Dynamic Simulation Parameters in task description</span>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isConvertingNodeToTask}
              className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition-all"
            >
              Cancel
            </button>

            {!isAuthenticated ? (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSigningIn}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400 px-5 py-2 text-xs font-semibold text-white shadow-lg transition-all hover:opacity-95 active:scale-95"
              >
                {isSigningIn ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                <span>Sign in with Google</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!title.trim() || isConvertingNodeToTask}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400 px-5 py-2 text-xs font-semibold text-white shadow-lg transition-all hover:opacity-95 active:scale-95 disabled:opacity-50"
              >
                {isConvertingNodeToTask ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Converting...</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-4 w-4" />
                    <span>Create & Link Task</span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export const NodeToTaskModal: React.FC = () => {
  const {
    canvasId,
    nodes,
    convertingNodeId,
    isNodeToTaskModalOpen,
    closeNodeToTaskModal,
  } = useCanvasStore();

  const targetNode = nodes.find((n) => n.id === convertingNodeId);

  if (!isNodeToTaskModalOpen || !targetNode || !canvasId) return null;

  return (
    <NodeToTaskForm
      key={targetNode.id}
      canvasId={canvasId}
      targetNode={targetNode}
      onClose={closeNodeToTaskModal}
    />
  );
};
