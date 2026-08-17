import { NextRequest } from 'next/server';
import { eq, and } from 'drizzle-orm';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { canvases, canvasNodes } from '@/db/schema/canvas';
import { evaluateNodeDerivation } from '@/services/math-solver';
import { EvaluateNodeSchema } from '@/lib/validators/canvas';
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/api-response';

// POST /api/canvas/:id/evaluate — Mathematical derivation step evaluation
export async function POST(
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

    const { id: canvasId } = await params;

    // Verify canvas ownership
    const [canvas] = await db
      .select({ id: canvases.id })
      .from(canvases)
      .where(and(eq(canvases.id, canvasId), eq(canvases.userId, session.user.id)));

    if (!canvas) {
      return errorResponse('Canvas not found or unauthorized', 404);
    }

    const body: unknown = await request.json();
    const parsed = EvaluateNodeSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    // Evaluate step derivation using Math Solver service
    const evaluation = await evaluateNodeDerivation(parsed.data);

    // Optionally update node validation status in DB if node exists
    await db
      .update(canvasNodes)
      .set({
        validationStatus: evaluation.validationStatus,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(canvasNodes.id, parsed.data.nodeId),
          eq(canvasNodes.canvasId, canvasId)
        )
      );

    return successResponse(evaluation, 'Derivation step evaluated successfully');
  } catch (error) {
    console.error('POST /api/canvas/[id]/evaluate error:', error);
    return errorResponse('Failed to evaluate derivation step', 500);
  }
}
