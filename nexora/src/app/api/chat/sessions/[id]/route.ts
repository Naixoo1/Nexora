import { NextRequest } from 'next/server';

import { auth } from '@/lib/auth';
import { getChatSessionHistory, deleteChatSession, updateChatSession } from '@/services/chat';
import { UpdateChatSessionSchema } from '@/lib/validators/chat';
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/api-response';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) return errorResponse('Unauthorized', 401);

    const { id } = await params;
    const history = await getChatSessionHistory(id, session.user.id);

    if (!history) return errorResponse('Session not found', 404);

    return successResponse(history, 'Chat history loaded');
  } catch (error) {
    console.error('GET /api/chat/sessions/[id] error:', error);
    return errorResponse('Failed to load chat history');
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) return errorResponse('Unauthorized', 401);

    const { id } = await params;
    const body: unknown = await req.json();
    const parsed = UpdateChatSessionSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const updated = await updateChatSession(id, session.user.id, parsed.data);
    if (!updated) return errorResponse('Session not found or unauthorized', 404);

    return successResponse(updated, 'Chat session updated');
  } catch (error) {
    console.error('PATCH /api/chat/sessions/[id] error:', error);
    return errorResponse('Failed to update chat session');
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) return errorResponse('Unauthorized', 401);

    const { id } = await params;
    const deleted = await deleteChatSession(id, session.user.id);

    if (!deleted) return errorResponse('Session not found or unauthorized', 404);

    return successResponse(null, 'Chat session deleted');
  } catch (error) {
    console.error('DELETE /api/chat/sessions/[id] error:', error);
    return errorResponse('Failed to delete chat session');
  }
}
