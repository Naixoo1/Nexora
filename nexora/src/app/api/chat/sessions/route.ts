import { NextRequest } from 'next/server';

import { auth } from '@/lib/auth';
import { listUserChatSessions, getOrCreateChatSession } from '@/services/chat';
import { CreateChatSessionSchema, ChatSessionListQuerySchema } from '@/lib/validators/chat';
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) return errorResponse('Unauthorized', 401);

    const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = ChatSessionListQuerySchema.safeParse(searchParams);

    if (!parsed.success) {
      return validationErrorResponse(
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const result = await listUserChatSessions(session.user.id, parsed.data);
    return successResponse(result, 'Chat sessions retrieved');
  } catch (error) {
    console.error('GET /api/chat/sessions error:', error);
    return errorResponse('Failed to retrieve chat sessions');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) return errorResponse('Unauthorized', 401);

    const body: unknown = await req.json();
    const parsed = CreateChatSessionSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const created = await getOrCreateChatSession(session.user.id, parsed.data);
    return successResponse(created, 'Chat session created', 201);
  } catch (error) {
    console.error('POST /api/chat/sessions error:', error);
    return errorResponse('Failed to create chat session');
  }
}
