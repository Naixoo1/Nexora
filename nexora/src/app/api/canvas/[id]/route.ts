import { NextRequest } from 'next/server';

import { auth } from '@/lib/auth';
import { getCanvasGraph, updateCanvas, deleteCanvas } from '@/services/canvas';
import { UpdateCanvasSchema } from '@/lib/validators/canvas';
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/api-response';

// GET /api/canvas/:id — Load full canvas graph
export async function GET(
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
    const graph = await getCanvasGraph(id, session.user.id);

    if (!graph) {
      return errorResponse('Canvas not found', 404);
    }

    return successResponse(graph, 'Canvas graph loaded successfully');
  } catch (error) {
    console.error('GET /api/canvas/[id] error:', error);
    return errorResponse('Failed to load canvas graph');
  }
}

// PATCH /api/canvas/:id — Update canvas metadata / viewport
export async function PATCH(
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
    const parsed = UpdateCanvasSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const updated = await updateCanvas(id, session.user.id, parsed.data);

    if (!updated) {
      return errorResponse('Canvas not found or unauthorized', 404);
    }

    return successResponse(updated, 'Canvas updated successfully');
  } catch (error) {
    console.error('PATCH /api/canvas/[id] error:', error);
    return errorResponse('Failed to update canvas');
  }
}

// DELETE /api/canvas/:id — Delete canvas and cascaded graph
export async function DELETE(
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
    const deleted = await deleteCanvas(id, session.user.id);

    if (!deleted) {
      return errorResponse('Canvas not found or unauthorized', 404);
    }

    return successResponse(null, 'Canvas deleted successfully');
  } catch (error) {
    console.error('DELETE /api/canvas/[id] error:', error);
    return errorResponse('Failed to delete canvas');
  }
}
