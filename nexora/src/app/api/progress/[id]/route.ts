import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { progressSnapshots } from '@/db/schema/tasks';
import { UpdateProgressSchema } from '@/lib/validators/task';
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/api-response';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return errorResponse('Unauthorized', 401);
    }

    const userId = session.user.id;
    const { id } = await params;

    const body: unknown = await req.json();
    const validatedData = UpdateProgressSchema.safeParse(body);

    if (!validatedData.success) {
      return validationErrorResponse(
        validatedData.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    // Verify the progress snapshot exists and belongs to the user
    const existingSnapshot = await db.query.progressSnapshots.findFirst({
      where: eq(progressSnapshots.id, id),
    });

    if (!existingSnapshot) {
      return errorResponse('Progress snapshot not found', 404);
    }

    if (existingSnapshot.userId !== userId) {
      return errorResponse('Forbidden', 403);
    }

    const updateData: Record<string, unknown> = {
      ...validatedData.data,
      updatedAt: new Date(),
    };

    // If status is 'completed' or 'cancelled', set endedAt to now
    if (updateData.status === 'completed' || updateData.status === 'cancelled') {
      updateData.endedAt = new Date();
    }

    const [updatedSnapshot] = await db
      .update(progressSnapshots)
      .set(updateData)
      .where(eq(progressSnapshots.id, id))
      .returning();

    return successResponse(updatedSnapshot, 'Progress snapshot updated successfully');
  } catch (error: unknown) {
    console.error('Failed to update progress snapshot:', error);
    return errorResponse('Internal Server Error', 500);
  }
}
