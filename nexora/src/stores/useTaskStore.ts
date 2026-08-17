import { create } from 'zustand';
import type {
  Task,
  TaskWithChildren,
  TaskStatus,
  TaskPriority,
  TaskSource,
  ProgressSnapshot,
  ProgressStatus,
  CreateTaskPayload,
  UpdateTaskPayload,
  UpdateProgressPayload,
  PlannerGeneratePayload,
  ApiResponse,
  PaginatedResponse,
} from '@/types/task';

// Maximum hierarchy depth allowed (0-indexed: 0, 1, 2 = 3 levels)
export const MAX_ALLOWED_DEPTH = 3;

/**
 * Builds a hierarchical tree (max 3 levels) from a flat list of tasks
 */
export function buildTaskTree(flatTasks: Task[]): TaskWithChildren[] {
  const taskMap = new Map<string, TaskWithChildren>();

  // Initialize nodes
  flatTasks.forEach((t) => {
    taskMap.set(t.id, {
      ...t,
      children: [],
      depth: 0,
    });
  });

  const roots: TaskWithChildren[] = [];

  flatTasks.forEach((t) => {
    const node = taskMap.get(t.id);
    if (!node) return;

    if (t.parentId && taskMap.has(t.parentId)) {
      const parent = taskMap.get(t.parentId)!;
      // Calculate depth from parent
      node.depth = Math.min(parent.depth + 1, MAX_ALLOWED_DEPTH - 1);
      if (node.depth < MAX_ALLOWED_DEPTH) {
        parent.children.push(node);
      } else {
        // Fallback to root if max depth exceeded
        node.depth = 0;
        roots.push(node);
      }
    } else {
      node.depth = 0;
      roots.push(node);
    }
  });

  return roots;
}

export interface TaskFilters {
  status: TaskStatus | 'all';
  priority: TaskPriority | 'all';
  source: TaskSource | 'all';
  search: string;
  sortBy: 'created_at' | 'due_date' | 'priority' | 'sort_order';
  sortDir: 'asc' | 'desc';
}

export interface TaskState {
  // Data
  tasks: Task[];
  taskTree: TaskWithChildren[];
  activeProgressSnapshot: ProgressSnapshot | null;
  expandedTaskIds: Record<string, boolean>;

  // Filters & Search
  filters: TaskFilters;

  // UI state
  isLoading: boolean;
  isCreating: boolean;
  isGeneratingPlan: boolean;
  isPlannerModalOpen: boolean;
  isCreateModalOpen: boolean;
  parentTaskIdForNewSubtask: string | null;
  editingTask: Task | null;
  error: string | null;

  // Actions
  fetchTasks: () => Promise<void>;
  createTask: (payload: CreateTaskPayload) => Promise<boolean>;
  updateTask: (id: string, payload: UpdateTaskPayload) => Promise<boolean>;
  deleteTask: (id: string) => Promise<boolean>;
  toggleTaskStatus: (id: string, currentStatus: TaskStatus) => Promise<void>;
  generateStudyPlan: (payload: PlannerGeneratePayload) => Promise<boolean>;

  // Progress Snapshot Actions
  setActiveProgressSnapshot: (snapshot: ProgressSnapshot | null) => void;
  updateProgressSnapshot: (id: string, payload: UpdateProgressPayload) => Promise<boolean>;
  toggleProgressTarget: (index: number) => Promise<void>;
  cancelProgressSnapshot: (id: string) => Promise<void>;
  updateProgressStatus: (id: string, status: ProgressStatus) => Promise<void>;

  // UI & Filter Actions
  setFilter: <K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) => void;
  resetFilters: () => void;
  toggleTaskExpanded: (taskId: string) => void;
  expandAllTasks: () => void;
  collapseAllTasks: () => void;
  openPlannerModal: (isOpen: boolean) => void;
  openCreateModal: (isOpen: boolean, parentId?: string | null, editTask?: Task | null) => void;
  clearError: () => void;
}

const DEFAULT_FILTERS: TaskFilters = {
  status: 'all',
  priority: 'all',
  source: 'all',
  search: '',
  sortBy: 'sort_order',
  sortDir: 'asc',
};

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  taskTree: [],
  activeProgressSnapshot: null,
  expandedTaskIds: {},

  filters: DEFAULT_FILTERS,

  isLoading: false,
  isCreating: false,
  isGeneratingPlan: false,
  isPlannerModalOpen: false,
  isCreateModalOpen: false,
  parentTaskIdForNewSubtask: null,
  editingTask: null,
  error: null,

  fetchTasks: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/tasks?limit=100');
      const json: ApiResponse<PaginatedResponse<Task>> = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.message || 'Failed to fetch tasks');
      }

      const items = json.data?.items || [];
      const tree = buildTaskTree(items);

      // Auto-expand all root tasks with children
      const initialExpanded: Record<string, boolean> = { ...get().expandedTaskIds };
      items.forEach((t) => {
        if (!t.parentId) {
          initialExpanded[t.id] = true;
        }
      });

      set({
        tasks: items,
        taskTree: tree,
        expandedTaskIds: initialExpanded,
        isLoading: false,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error occurred while fetching tasks';
      set({ error: msg, isLoading: false });
    }
  },

  createTask: async (payload: CreateTaskPayload) => {
    set({ isCreating: true, error: null });
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json: ApiResponse<Task> = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.message || 'Failed to create task');
      }

      // Re-fetch all tasks to maintain correct tree ordering and depth
      await get().fetchTasks();

      // If created subtask, expand parent
      if (payload.parentId) {
        set((state) => ({
          expandedTaskIds: { ...state.expandedTaskIds, [payload.parentId!]: true },
        }));
      }

      set({ isCreating: false, isCreateModalOpen: false, parentTaskIdForNewSubtask: null, editingTask: null });
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create task';
      set({ error: msg, isCreating: false });
      return false;
    }
  },

  updateTask: async (id: string, payload: UpdateTaskPayload) => {
    set({ error: null });
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json: ApiResponse<Task> = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.message || 'Failed to update task');
      }

      // Update state locally & refresh tree
      const updatedTasks = get().tasks.map((t) => (t.id === id ? { ...t, ...json.data! } : t));
      set({
        tasks: updatedTasks,
        taskTree: buildTaskTree(updatedTasks),
        isCreateModalOpen: false,
        editingTask: null,
      });

      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update task';
      set({ error: msg });
      return false;
    }
  },

  deleteTask: async (id: string) => {
    set({ error: null });
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      });

      const json: ApiResponse<Task> = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.message || 'Failed to delete task');
      }

      // Refresh task list
      await get().fetchTasks();
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete task';
      set({ error: msg });
      return false;
    }
  },

  toggleTaskStatus: async (id: string, currentStatus: TaskStatus) => {
    const nextStatus: TaskStatus = currentStatus === 'completed' ? 'todo' : 'completed';
    
    // Optimistic UI update
    const currentTasks = get().tasks;
    const optimisticTasks = currentTasks.map((t) =>
      t.id === id
        ? {
            ...t,
            status: nextStatus,
            completedAt: nextStatus === 'completed' ? new Date().toISOString() : null,
          }
        : t
    );

    set({
      tasks: optimisticTasks,
      taskTree: buildTaskTree(optimisticTasks),
    });

    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      const json: ApiResponse<Task> = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.message || 'Status toggle failed');
      }
    } catch (err: unknown) {
      // Revert optimistic update
      set({
        tasks: currentTasks,
        taskTree: buildTaskTree(currentTasks),
        error: err instanceof Error ? err.message : 'Failed to toggle task status',
      });
    }
  },

  generateStudyPlan: async (payload: PlannerGeneratePayload) => {
    set({ isGeneratingPlan: true, error: null });
    try {
      const response = await fetch('/api/planner/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json: ApiResponse<unknown> = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.message || 'Failed to generate study plan');
      }

      // Re-fetch tasks to incorporate the newly generated atomic tree
      await get().fetchTasks();

      set({
        isGeneratingPlan: false,
        isPlannerModalOpen: false,
      });
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate study plan';
      set({ error: msg, isGeneratingPlan: false });
      return false;
    }
  },

  setActiveProgressSnapshot: (snapshot: ProgressSnapshot | null) => {
    set({ activeProgressSnapshot: snapshot });
  },

  updateProgressSnapshot: async (id: string, payload: UpdateProgressPayload) => {
    try {
      const response = await fetch(`/api/progress/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json: ApiResponse<ProgressSnapshot> = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.message || 'Failed to update progress');
      }

      set({ activeProgressSnapshot: json.data });
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update progress snapshot';
      set({ error: msg });
      return false;
    }
  },

  toggleProgressTarget: async (index: number) => {
    const snapshot = get().activeProgressSnapshot;
    if (!snapshot || !snapshot.targets[index]) return;

    const newTargets = snapshot.targets.map((t, i) =>
      i === index ? { ...t, completed: !t.completed } : t
    );

    const completedCount = newTargets.filter((t) => t.completed).length;

    // Optimistic update
    const optimisticSnapshot: ProgressSnapshot = {
      ...snapshot,
      targets: newTargets,
      completedSteps: completedCount,
      status: completedCount === snapshot.totalSteps ? 'completed' : snapshot.status,
    };

    set({ activeProgressSnapshot: optimisticSnapshot });

    // Send update to server
    await get().updateProgressSnapshot(snapshot.id, {
      targets: newTargets,
      completedSteps: completedCount,
      status: completedCount === snapshot.totalSteps ? 'completed' : undefined,
    });
  },

  cancelProgressSnapshot: async (id: string) => {
    const snapshot = get().activeProgressSnapshot;
    if (!snapshot) return;

    // Optimistic update
    set({
      activeProgressSnapshot: {
        ...snapshot,
        status: 'cancelled',
        endedAt: new Date().toISOString(),
      },
    });

    await get().updateProgressSnapshot(id, {
      status: 'cancelled',
    });
  },

  updateProgressStatus: async (id: string, status: ProgressStatus) => {
    const snapshot = get().activeProgressSnapshot;
    if (!snapshot) return;

    set({
      activeProgressSnapshot: {
        ...snapshot,
        status,
        endedAt: status === 'completed' || status === 'cancelled' ? new Date().toISOString() : null,
      },
    });

    await get().updateProgressSnapshot(id, { status });
  },

  setFilter: (key, value) => {
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: value,
      },
    }));
  },

  resetFilters: () => {
    set({ filters: DEFAULT_FILTERS });
  },

  toggleTaskExpanded: (taskId: string) => {
    set((state) => ({
      expandedTaskIds: {
        ...state.expandedTaskIds,
        [taskId]: !state.expandedTaskIds[taskId],
      },
    }));
  },

  expandAllTasks: () => {
    const allExpanded: Record<string, boolean> = {};
    get().tasks.forEach((t) => {
      allExpanded[t.id] = true;
    });
    set({ expandedTaskIds: allExpanded });
  },

  collapseAllTasks: () => {
    set({ expandedTaskIds: {} });
  },

  openPlannerModal: (isOpen: boolean) => {
    set({ isPlannerModalOpen: isOpen, error: null });
  },

  openCreateModal: (isOpen: boolean, parentId: string | null = null, editTask: Task | null = null) => {
    set({
      isCreateModalOpen: isOpen,
      parentTaskIdForNewSubtask: parentId,
      editingTask: editTask,
      error: null,
    });
  },

  clearError: () => {
    set({ error: null });
  },
}));
