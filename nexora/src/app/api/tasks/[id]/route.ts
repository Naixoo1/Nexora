import { NextRequest } from 'next/server';
import { eq, and } from 'drizzle-orm';

import { db } from '@/lib/db';
import { tasks } from '@/db/schema/tasks';
import { UpdateTaskSchema } from '@/lib/validators/task';
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/api-response';

import type { TaskSelect } from '@/db/schema/tasks';

// Helper: Calculate sub-task depth
async function getTaskDepth(taskId: string): Promise<number> {
  let depth = 0;
  let currentId: string | null = taskId;

  while (currentId) {
    const [parent] = await db
      .select({ parentId: tasks.parentId })
      .from(tasks)
      .where(eq(tasks.id, currentId));

    if (!parent) break;
    depth++;
    currentId = parent.parentId;
  }

  return depth;
}

// Helper: Build task tree (recursive child fetching)
type TaskTreeNode = TaskSelect & { children: TaskTreeNode[]; depth: number };

async function buildTaskTree(taskId: string, currentDepth: number = 0): Promise<TaskTreeNode[]> {
  if (currentDepth >= 3) return [];

  const children = await db.select().from(tasks).where(eq(tasks.parentId, taskId));
  const childrenWithTree: TaskTreeNode[] = [];

  for (const child of children) {
    const grandChildren = await buildTaskTree(child.id, currentDepth + 1);
    childrenWithTree.push({
      ...child,
      children: grandChildren,
      depth: currentDepth + 1,
    });
  }

  return childrenWithTree;
}

// GET /api/tasks/:id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // TODO: Add auth check — get userId from session
    const userId = ''; // placeholder

    const [task] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));

    if (!task) {
      return errorResponse('Task not found', 404);
    }

    const children = await buildTaskTree(task.id);
    const taskWithChildren = {
      ...task,
      children,
      depth: 0,
    };

    return successResponse(taskWithChildren, 'Task retrieved successfully');
  } catch (error) {
    console.error('GET /api/tasks/[id] error:', error);
    return errorResponse('Failed to retrieve task');
  }
}

// PATCH /api/tasks/:id
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // TODO: Add auth check — get userId from session
    const userId = ''; // placeholder

    // Check if task exists and belongs to user
    const [existingTask] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));

    if (!existingTask) {
      return errorResponse('Task not found', 404);
    }

    const body: unknown = await request.json();
    const parsed = UpdateTaskSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const data = parsed.data;

    // Validate sub-task depth if parentId is changed
    if (data.parentId !== undefined && data.parentId !== existingTask.parentId) {
      if (data.parentId !== null) {
        const depth = await getTaskDepth(data.parentId);
        if (depth >= 3) {
          return errorResponse('Maximum sub-task depth of 3 levels exceeded', 400);
        }
      }
    }

    const updateData: Record<string, unknown> = {
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : data.dueDate === null ? null : undefined,
      updatedAt: new Date()
    };
    
    // Remove undefined values
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    if (data.status === 'completed' && existingTask.status !== 'completed') {
      updateData.completedAt = new Date();
    } else if (data.status && data.status !== 'completed') {
      updateData.completedAt = null;
    }

    const [updatedTask] = await db
      .update(tasks)
      .set(updateData)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();

    return successResponse(updatedTask, 'Task updated successfully');
  } catch (error) {
    console.error('PATCH /api/tasks/[id] error:', error);
    return errorResponse('Failed to update task');
  }
}

// DELETE /api/tasks/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // TODO: Add auth check — get userId from session
    const userId = ''; // placeholder

    // Delete task (children deleted by CASCADE)
    const [deletedTask] = await db
      .delete(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();

    if (!deletedTask) {
      return errorResponse('Task not found', 404);
    }

    return successResponse(deletedTask, 'Task deleted successfully');
  } catch (error) {
    console.error('DELETE /api/tasks/[id] error:', error);
    return errorResponse('Failed to delete task');
  }
}
