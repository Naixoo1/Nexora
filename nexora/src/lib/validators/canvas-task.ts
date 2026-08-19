import { z } from 'zod';
import { TaskPrioritySchema, TaskStatusSchema } from './task';

export const NodeToTaskConvertSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional(),
  priority: TaskPrioritySchema.default('medium'),
  category: z.string().max(50).optional(),
  dueDate: z.string().datetime({ offset: true }).optional(),
  parentTaskId: z.string().uuid().optional(),
  includeVariablesInDescription: z.boolean().default(true),
  includeLatexInDescription: z.boolean().default(true),
});

export const CanvasTasksQuerySchema = z.object({
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type NodeToTaskConvert = z.infer<typeof NodeToTaskConvertSchema>;
export type CanvasTasksQuery = z.infer<typeof CanvasTasksQuerySchema>;
