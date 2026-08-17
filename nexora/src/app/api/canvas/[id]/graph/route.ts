import { NextRequest } from 'next/server';

import { auth } from '@/lib/auth';
import { saveCanvasGraph } from '@/services/canvas';
import { SaveGraphSchema } from '@/lib/validators/canvas';
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/api-response';

// PUT /api/canvas/:id/graph — Atomic batch sync of DAG graph
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return errorResponse('Unauthorized', 401);
    }

    const { id } = await params;
    const body: unknown = await request.json();
    const parsed = SaveGraphSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const result = await saveCanvasGraph(id, session.user.id, parsed.data);
    return successResponse(result, 'Graph saved successfully');
  } catch (error) {
    console.error('PUT /api/canvas/[id]/graph error:', error);
    const message = error instanceof Error ? error.message : 'Failed to save graph';
    return errorResponse(message, 500);
  }
}
