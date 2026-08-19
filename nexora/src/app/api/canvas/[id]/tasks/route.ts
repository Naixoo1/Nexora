import { NextRequest } from 'next/server';

import { auth } from '@/lib/auth';
import { listCanvasLinkedTasks } from '@/services/canvas-task';
import { CanvasTasksQuerySchema } from '@/lib/validators/canvas-task';
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/api-response';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return errorResponse('Unauthorized', 401);
    }

    const { id: canvasId } = await params;
    const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = CanvasTasksQuerySchema.safeParse(searchParams);

    if (!parsed.success) {
      return validationErrorResponse(
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const result = await listCanvasLinkedTasks(
      canvasId,
      session.user.id,
      parsed.data
    );

    return successResponse(result, 'Canvas linked tasks retrieved successfully');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve canvas linked tasks';
    if (message.includes('not found') || message.includes('unauthorized')) {
      return errorResponse(message, 404);
    }

    console.error('GET /api/canvas/[id]/tasks error:', error);
    return errorResponse(message, 500);
  }
}
