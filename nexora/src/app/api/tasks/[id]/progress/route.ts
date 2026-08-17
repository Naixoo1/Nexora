import { NextRequest } from 'next/server';
import { eq, and, desc } from 'drizzle-orm';

import { db } from '@/lib/db';
import { tasks, progressSnapshots } from '@/db/schema/tasks';
import { CreateProgressSchema } from '@/lib/validators/task';
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/api-response';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    
    // TODO: Add auth check — get userId from session
    const userId = 'placeholder-user-id';

    const body = await req.json();
    
    // Validate body with CreateProgressSchema but override the taskId from the URL param
    const payload = { ...body, taskId };
    const validatedData = CreateProgressSchema.safeParse(payload);

    if (!validatedData.success) {
      return validationErrorResponse(validatedData.error.flatten().fieldErrors as Record<string, string[]>);
    }

    // Verify the task exists and belongs to the user
    const task = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, taskId), eq(tasks.userId, userId))
    });

    if (!task) {
      return errorResponse('Task not found', 404);
    }

    const [snapshot] = await db
      .insert(progressSnapshots)
      .values({
        ...validatedData.data,
        userId,
      })
      .returning();

    return successResponse(snapshot, 'Progress snapshot created successfully', 201);
  } catch (error: unknown) {
    console.error('Failed to create progress snapshot:', error);
    return errorResponse('Internal Server Error', 500);
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    
    // TODO: Add auth check — get userId from session
    const userId = 'placeholder-user-id';

    // Verify the task belongs to the user
    const task = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, taskId), eq(tasks.userId, userId))
    });

    if (!task) {
      return errorResponse('Task not found', 404);
    }

    // Get all progress snapshots for the task, ordered by createdAt desc
    const snapshots = await db.query.progressSnapshots.findMany({
      where: eq(progressSnapshots.taskId, taskId),
      orderBy: [desc(progressSnapshots.createdAt)],
    });

    return successResponse(snapshots, 'Progress snapshots retrieved successfully');
  } catch (error: unknown) {
    console.error('Failed to get progress snapshots:', error);
    return errorResponse('Internal Server Error', 500);
  }
}
