import { NextRequest } from 'next/server';

import { auth } from '@/lib/auth';
import { saveChatMessage } from '@/services/chat';
import { CreateChatMessageSchema } from '@/lib/validators/chat';
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/api-response';
import type { ChatAttachment } from '@/types/chat';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) return errorResponse('Unauthorized', 401);

    const { id } = await params;
    const body: unknown = await req.json();
    const parsed = CreateChatMessageSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const { role, content, contextSnapshot, attachments } = parsed.data;

    const savedMessage = await saveChatMessage(
      id,
      session.user.id,
      role,
      content,
      contextSnapshot,
      attachments as ChatAttachment[] | undefined
    );

    return successResponse(savedMessage, 'Message saved', 201);
  } catch (error) {
    console.error('POST /api/chat/sessions/[id]/messages error:', error);
    return errorResponse('Failed to persist message');
  }
}
