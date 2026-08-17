import { z } from 'zod';

export const TaskStatusSchema = z.enum(['todo', 'in_progress', 'completed', 'cancelled']);
export const TaskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
export const TaskSourceSchema = z.enum(['manual', 'ai_planner', 'ai_brainstorm']);
export const ProgressStatusSchema = z.enum(['active', 'paused', 'completed', 'cancelled']);

export const ProgressTargetSchema = z.object({
  label: z.string().min(1).max(500),
  completed: z.boolean(),
});

export const CreateTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  parentId: z.string().uuid().optional(),
  status: TaskStatusSchema.default('todo'),
  priority: TaskPrioritySchema.default('medium'),
  category: z.string().max(50).optional(),
  dueDate: z.string().datetime({ offset: true }).optional(),
  source: TaskSourceSchema.default('manual'),
  aiSessionId: z.string().uuid().optional(),
  sortOrder: z.number().int().min(0).default(0),
});

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  category: z.string().max(50).nullable().optional(),
  dueDate: z.string().datetime({ offset: true }).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided for update" }
);

export const CreateProgressSchema = z.object({
  taskId: z.string().uuid(),
  aiSessionId: z.string().uuid().optional(),
  totalSteps: z.number().int().min(1),
  targets: z.array(ProgressTargetSchema).min(1).max(50),
});

export const UpdateProgressSchema = z.object({
  completedSteps: z.number().int().min(0).optional(),
  targets: z.array(ProgressTargetSchema).min(1).max(50).optional(),
  status: ProgressStatusSchema.optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided for update" }
);

export const TaskListQuerySchema = z.object({
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  source: TaskSourceSchema.optional(),
  parentId: z.string().uuid().nullable().optional(),
  dueBefore: z.string().datetime({ offset: true }).optional(),
  dueAfter: z.string().datetime({ offset: true }).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['created_at', 'due_date', 'priority', 'sort_order', 'updated_at']).default('sort_order'),
  sortDir: z.enum(['asc', 'desc']).default('asc'),
});

export const PlannerGenerateSchema = z.object({
  prompt: z.string().min(1).max(2000),
  dueDate: z.string().datetime({ offset: true }).optional(),
  category: z.string().max(50).optional(),
  maxTasks: z.number().int().min(1).max(50).default(10),
});

export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;
export type TaskSource = z.infer<typeof TaskSourceSchema>;
export type ProgressStatus = z.infer<typeof ProgressStatusSchema>;
export type ProgressTarget = z.infer<typeof ProgressTargetSchema>;
export type CreateTask = z.infer<typeof CreateTaskSchema>;
export type UpdateTask = z.infer<typeof UpdateTaskSchema>;
export type CreateProgress = z.infer<typeof CreateProgressSchema>;
export type UpdateProgress = z.infer<typeof UpdateProgressSchema>;
export type TaskListQuery = z.infer<typeof TaskListQuerySchema>;
export type PlannerGenerate = z.infer<typeof PlannerGenerateSchema>;
