import { NextRequest } from 'next/server';

import { auth } from '@/lib/auth';
import { convertNodeToTask } from '@/services/canvas-task';
import { NodeToTaskConvertSchema } from '@/lib/validators/canvas-task';
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/api-response';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; nodeId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return errorResponse('Unauthorized', 401);
    }

    const { id: canvasId, nodeId } = await params;
    const body: unknown = await req.json().catch(() => ({}));
    const parsed = NodeToTaskConvertSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const createdTask = await convertNodeToTask(
      canvasId,
      nodeId,
      session.user.id,
      parsed.data
    );

    return successResponse(
      createdTask,
      'Task created from canvas node successfully',
      201
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to convert node to task';
    if (message.includes('not found') || message.includes('unauthorized')) {
      return errorResponse(message, 404);
    }
    if (message.includes('Maximum sub-task depth')) {
      return errorResponse(message, 400);
    }

    console.error('POST /api/canvas/[id]/nodes/[nodeId]/to-task error:', error);
    return errorResponse(message, 500);
  }
}
