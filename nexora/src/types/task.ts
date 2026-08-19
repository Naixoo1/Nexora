// Union types for enums
export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskSource = 'manual' | 'ai_planner' | 'ai_brainstorm' | 'canvas_export';
export type ProgressStatus = 'active' | 'paused' | 'completed' | 'cancelled';

// Max sub-task depth
export const MAX_TASK_DEPTH = 3;

// Core entity interfaces
export interface Task {
  id: string;
  userId: string;
  parentId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  category: string | null;
  dueDate: Date | string | null;
  completedAt: Date | string | null;
  source: TaskSource;
  aiSessionId: string | null;
  sortOrder: number;

  // STEM Canvas node compatibility
  canvasNodeId?: string | null;
  nodeX?: number | null;
  nodeY?: number | null;
  latexFormula?: string | null;

  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface TaskWithChildren extends Task {
  children: TaskWithChildren[];
  depth: number;
}

export interface ProgressTarget {
  label: string;
  completed: boolean;
}

export interface ProgressSnapshot {
  id: string;
  taskId: string;
  userId: string;
  aiSessionId: string | null;
  totalSteps: number;
  completedSteps: number;
  targets: ProgressTarget[];
  status: ProgressStatus;
  startedAt: Date | string;
  endedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// API payloads
export interface CreateTaskPayload {
  title: string;
  description?: string;
  parentId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: string;
  dueDate?: string;
  source?: TaskSource;
  aiSessionId?: string;
  sortOrder?: number;
  canvasNodeId?: string;
  nodeX?: number;
  nodeY?: number;
  latexFormula?: string;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string | null;
  parentId?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: string | null;
  dueDate?: string | null;
  sortOrder?: number;
  canvasNodeId?: string | null;
  nodeX?: number | null;
  nodeY?: number | null;
  latexFormula?: string | null;
}

export interface CreateProgressPayload {
  taskId: string;
  aiSessionId?: string;
  totalSteps: number;
  targets: ProgressTarget[];
}

export interface UpdateProgressPayload {
  completedSteps?: number;
  targets?: ProgressTarget[];
  status?: ProgressStatus;
}

export interface TaskListQuery {
  status?: TaskStatus;
  priority?: TaskPriority;
  source?: TaskSource;
  parentId?: string | null;
  dueBefore?: string;
  dueAfter?: string;
  search?: string;
  page: number;
  limit: number;
  sortBy: 'created_at' | 'due_date' | 'priority' | 'sort_order' | 'updated_at';
  sortDir: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Planner types
export interface PlannerGeneratePayload {
  prompt: string;
  dueDate?: string;
  category?: string;
  maxTasks?: number;
}

export interface PlannerTaskItem {
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string;
  canvasNodeId?: string;
  nodeX?: number;
  nodeY?: number;
  latexFormula?: string;
  children?: PlannerTaskItem[];
}

// Standardized API Response
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string;
  errors?: Record<string, string[]>;
}
