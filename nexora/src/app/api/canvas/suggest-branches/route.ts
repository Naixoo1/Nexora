import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { suggestBranchesForNode } from '@/services/branch-suggester';
import { SuggestBranchSchema } from '@/lib/validators/canvas';
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/api-response';

/**
 * POST /api/canvas/suggest-branches
 * Direct AI multi-branch generation with full graph lineage, ancestor path, and 3 pedagogical angles.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return errorResponse('Unauthorized', 401);
    }

    const body: unknown = await request.json();
    const parsed = SuggestBranchSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const targetNode = parsed.data.selectedNode;

    const existingContext = (parsed.data.ancestorNodes || [])
      .map(
        (n) =>
          `[${n.nodeType || 'step'}] "${n.title}" ${n.latexFormula ? `($${n.latexFormula}$)` : ''} ${
            n.content ? `- ${n.content}` : ''
          }`
      )
      .join('\n');

    const suggestions = await suggestBranchesForNode(
      parsed.data,
      targetNode?.title,
      targetNode?.latexFormula,
      targetNode?.content,
      existingContext || undefined
    );

    return successResponse(suggestions, 'Branch suggestions generated successfully');
  } catch (error) {
    console.error('POST /api/canvas/suggest-branches error:', error);
    return errorResponse('Failed to generate branch suggestions', 500);
  }
}
