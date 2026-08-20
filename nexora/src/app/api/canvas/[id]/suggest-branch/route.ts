import { NextRequest } from 'next/server';
import { eq, and } from 'drizzle-orm';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { canvases, canvasNodes } from '@/db/schema/canvas';
import { suggestBranchesForNode } from '@/services/math-solver';
import { SuggestBranchSchema } from '@/lib/validators/canvas';
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/api-response';

// POST /api/canvas/:id/suggest-branch — AI deduction and What-If branch generation
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
    const parsed = SuggestBranchSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    // Look up target node and full canvas DAG context
    const allCanvasNodes = await db
      .select()
      .from(canvasNodes)
      .where(eq(canvasNodes.canvasId, canvasId));

    const targetNode = allCanvasNodes.find((n) => n.id === parsed.data.targetNodeId);

    const existingContext = allCanvasNodes
      .filter((n) => n.id !== parsed.data.targetNodeId)
      .map(
        (n) =>
          `[${n.nodeType}] "${n.title}" ${n.latexFormula ? `($${n.latexFormula}$)` : ''} ${
            n.content ? `- ${n.content}` : ''
          }`
      )
      .join('\n');

    const suggestions = await suggestBranchesForNode(
      parsed.data,
      targetNode?.title,
      targetNode?.latexFormula ?? undefined,
      targetNode?.content ?? undefined,
      existingContext || undefined
    );

    return successResponse(suggestions, 'Branch suggestions generated successfully');
  } catch (error) {
    console.error('POST /api/canvas/[id]/suggest-branch error:', error);
    return errorResponse('Failed to generate branch suggestions', 500);
  }
}
