'use client';

import React, { useMemo } from 'react';
import {
  Search,
  X,
  Filter,
  ArrowUpDown,
  Plus,
  Sparkles,
  CheckCircle,
  Clock,
  ListTodo,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { Task, TaskWithChildren, TaskStatus, TaskPriority, TaskSource } from '@/types/task';
import { TaskCard } from './TaskCard';
import { useTaskStore, type TaskFilters } from '@/stores/useTaskStore';
import { cn } from '@/lib/utils';

export const TaskList: React.FC = () => {
  const {
    tasks,
    taskTree,
    expandedTaskIds,
    filters,
    isLoading,
    toggleTaskExpanded,
    expandAllTasks,
    collapseAllTasks,
    setFilter,
    resetFilters,
    toggleTaskStatus,
    updateTask,
    deleteTask,
    openCreateModal,
    openPlannerModal,
  } = useTaskStore();

  // Status counts for filter pills
  const counts = useMemo(() => {
    return {
      all: tasks.length,
      todo: tasks.filter((t) => t.status === 'todo').length,
      in_progress: tasks.filter((t) => t.status === 'in_progress').length,
      completed: tasks.filter((t) => t.status === 'completed').length,
      cancelled: tasks.filter((t) => t.status === 'cancelled').length,
    };
  }, [tasks]);

  // Filter tasks & trees based on active filters
  const filteredTree = useMemo(() => {
    const matchesFilters = (t: Task): boolean => {
      // Status filter
      if (filters.status !== 'all' && t.status !== filters.status) return false;
      // Priority filter
      if (filters.priority !== 'all' && t.priority !== filters.priority) return false;
      // Source filter
      if (filters.source !== 'all' && t.source !== filters.source) return false;
      // Search filter
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const titleMatch = t.title.toLowerCase().includes(query);
        const descMatch = t.description?.toLowerCase().includes(query) ?? false;
        const catMatch = t.category?.toLowerCase().includes(query) ?? false;
        if (!titleMatch && !descMatch && !catMatch) return false;
      }
      return true;
    };

    // Filter tree preserving parent-child relations if parent or any descendant matches
    const filterNode = (node: TaskWithChildren): TaskWithChildren | null => {
      const filteredChildren = node.children
        .map((c) => filterNode(c))
        .filter((c): c is TaskWithChildren => c !== null);

      const selfMatches = matchesFilters(node);
      const hasMatchingChildren = filteredChildren.length > 0;

      if (selfMatches || hasMatchingChildren) {
        return {
          ...node,
          children: filteredChildren,
        };
      }
      return null;
    };

    let result = taskTree
      .map((root) => filterNode(root))
      .filter((root): root is TaskWithChildren => root !== null);

    // Apply Sorting on root level
    result = [...result].sort((a, b) => {
      const dir = filters.sortDir === 'asc' ? 1 : -1;
      if (filters.sortBy === 'due_date') {
        const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return (dateA - dateB) * dir;
      }
      if (filters.sortBy === 'priority') {
        const weights: Record<TaskPriority, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
        return (weights[b.priority] - weights[a.priority]) * dir;
      }
      if (filters.sortBy === 'created_at') {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return (dateA - dateB) * dir;
      }
      // sort_order default
      return (a.sortOrder - b.sortOrder) * dir;
    });

    return result;
  }, [taskTree, filters]);

  // Recursive Tree Node Renderer (Max 3 levels: depth 0, 1, 2)
  const renderTaskTreeNode = (node: TaskWithChildren, depth = 0) => {
    const isExpanded = expandedTaskIds[node.id] ?? true;
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} className="space-y-2">
        <TaskCard
          task={node}
          depth={depth}
          isExpanded={isExpanded}
          onToggleExpand={() => toggleTaskExpanded(node.id)}
          onToggleStatus={(id, status) => toggleTaskStatus(id, status)}
          onStatusChange={(id, status) => updateTask(id, { status })}
          onAddSubtask={(parentId) => openCreateModal(true, parentId)}
          onEditTask={(task) => openCreateModal(true, task.parentId, task)}
          onDeleteTask={(id) => deleteTask(id)}
        />

        {/* Render children if expanded and within 3 levels (depth < 2 -> children will have depth = depth + 1) */}
        {hasChildren && isExpanded && depth < 2 && (
          <div className="relative space-y-2">
            {node.children.map((child) => renderTaskTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Search & Actions Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
            placeholder="Search tasks, categories, or keywords..."
            className="w-full rounded-xl border border-white/10 bg-[#131926] py-2.5 pl-10 pr-9 text-sm text-white placeholder-slate-500 transition-all focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => setFilter('search', '')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Buttons: + Add Task & ✨ AI Study Planner */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openPlannerModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-500 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all hover:opacity-95 active:scale-[0.98]"
          >
            <Sparkles className="h-4 w-4" />
            <span>AI Study Planner</span>
          </button>

          <button
            type="button"
            onClick={() => openCreateModal(true, null)}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-white transition-all hover:bg-indigo-500 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Controls */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b border-white/10 pb-3.5">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {(
            [
              { id: 'all', label: 'All', count: counts.all },
              { id: 'todo', label: 'To Do', count: counts.todo },
              { id: 'in_progress', label: 'In Progress', count: counts.in_progress },
              { id: 'completed', label: 'Completed', count: counts.completed },
              { id: 'cancelled', label: 'Cancelled', count: counts.cancelled },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter('status', tab.id)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-medium transition-all',
                filters.status === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-[#131926] text-slate-400 hover:bg-white/10 hover:text-slate-200 border border-white/5'
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.2 text-[10px] font-mono',
                  filters.status === tab.id
                    ? 'bg-white/20 text-white'
                    : 'bg-white/5 text-slate-400'
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Secondary Filters & Sorters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Priority Filter */}
          <select
            value={filters.priority}
            onChange={(e) => setFilter('priority', e.target.value as TaskPriority | 'all')}
            className="rounded-lg border border-white/10 bg-[#131926] px-2.5 py-1.5 text-xs text-slate-300 transition-colors focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Source Filter */}
          <select
            value={filters.source}
            onChange={(e) => setFilter('source', e.target.value as TaskSource | 'all')}
            className="rounded-lg border border-white/10 bg-[#131926] px-2.5 py-1.5 text-xs text-slate-300 transition-colors focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">All Sources</option>
            <option value="manual">Manual</option>
            <option value="ai_planner">AI Planner</option>
            <option value="ai_brainstorm">AI Brainstorm</option>
          </select>

          {/* Sort By */}
          <div className="flex items-center rounded-lg border border-white/10 bg-[#131926]">
            <select
              value={filters.sortBy}
              onChange={(e) =>
                setFilter('sortBy', e.target.value as TaskFilters['sortBy'])
              }
              className="bg-transparent px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
            >
              <option value="sort_order">Default Order</option>
              <option value="due_date">Due Date</option>
              <option value="priority">Priority</option>
              <option value="created_at">Date Created</option>
            </select>
            <button
              type="button"
              onClick={() =>
                setFilter('sortDir', filters.sortDir === 'asc' ? 'desc' : 'asc')
              }
              className="px-2 py-1.5 text-slate-400 hover:text-white border-l border-white/10"
              title={`Sort ${filters.sortDir === 'asc' ? 'Descending' : 'Ascending'}`}
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Expand / Collapse All */}
          <div className="flex items-center rounded-lg border border-white/10 bg-[#131926]">
            <button
              type="button"
              onClick={expandAllTasks}
              className="p-1.5 text-slate-400 hover:text-white"
              title="Expand all"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={collapseAllTasks}
              className="p-1.5 text-slate-400 hover:text-white border-l border-white/10"
              title="Collapse all"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Task List Hierarchy View */}
      {isLoading ? (
        <div className="space-y-3 py-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl border border-white/5 bg-[#131926]/60"
            />
          ))}
        </div>
      ) : filteredTree.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#131926]/40 px-6 py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20">
            <ListTodo className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-white">No tasks found</h3>
          <p className="mt-1 max-w-md text-xs sm:text-sm text-slate-400">
            {filters.search || filters.status !== 'all' || filters.priority !== 'all'
              ? 'No tasks match your active filters. Try adjusting your query or reset filters.'
              : 'You have no study tasks yet. Create a task manually or let AI generate a structured study plan for you.'}
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            {filters.search || filters.status !== 'all' || filters.priority !== 'all' ? (
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white"
              >
                Reset Filters
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => openPlannerModal(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-2 text-xs font-semibold text-white shadow-lg transition-all hover:opacity-90"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate AI Study Plan
                </button>
                <button
                  type="button"
                  onClick={() => openCreateModal(true, null)}
                  className="flex items-center gap-1.5 rounded-xl bg-white/10 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-white/20"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create Task
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTree.map((rootTask) => renderTaskTreeNode(rootTask, 0))}
        </div>
      )}
    </div>
  );
};
