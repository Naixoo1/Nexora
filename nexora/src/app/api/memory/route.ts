import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getUserMemory,
  upsertUserMemory,
  resetUserMemory,
  DEFAULT_LEARNING_STYLE,
  DEFAULT_ACADEMIC_GOAL,
} from '@/services/memory';
import { successResponse, errorResponse } from '@/lib/api-response';
import type { UserMemoryPayload } from '@/types/memory';

export async function GET(req: NextRequest): Promise<Response> {
  try {
    let userId: string | null = null;
    try {
      const session = await auth.api.getSession({
        headers: req.headers,
      });
      if (session?.user?.id) {
        userId = session.user.id;
      }
    } catch {
      // Unauthenticated fallback
    }

    if (!userId) {
      // Return default guest memory profile
      return successResponse({
        id: 'guest-memory',
        userId: 'guest',
        academicStrengths: [],
        academicWeaknesses: [],
        learningStyle: DEFAULT_LEARNING_STYLE,
        academicGoal: DEFAULT_ACADEMIC_GOAL,
        extractedTopics: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    let memory = await getUserMemory(userId);
    if (!memory) {
      // Initialize fresh memory record
      memory = await upsertUserMemory(userId, {
        academicStrengths: [],
        academicWeaknesses: [],
        learningStyle: DEFAULT_LEARNING_STYLE,
        academicGoal: DEFAULT_ACADEMIC_GOAL,
        extractedTopics: [],
      });
    }

    return successResponse(memory);
  } catch (err) {
    console.error('[Memory API GET Error]:', err);
    return errorResponse(err instanceof Error ? err.message : 'Failed to retrieve memory profile', 500);
  }
}

export async function PUT(req: NextRequest): Promise<Response> {
  try {
    let userId: string | null = null;
    try {
      const session = await auth.api.getSession({
        headers: req.headers,
      });
      if (session?.user?.id) {
        userId = session.user.id;
      }
    } catch {
      // Unauthenticated
    }

    if (!userId) {
      return errorResponse('Authentication required to save persistent learning memory', 401);
    }

    const body: UserMemoryPayload = await req.json().catch(() => ({}));
    const updated = await upsertUserMemory(userId, body);

    return successResponse(updated, 'Learning memory profile successfully updated');
  } catch (err) {
    console.error('[Memory API PUT Error]:', err);
    return errorResponse(err instanceof Error ? err.message : 'Failed to update memory profile', 500);
  }
}

export async function DELETE(req: NextRequest): Promise<Response> {
  try {
    let userId: string | null = null;
    try {
      const session = await auth.api.getSession({
        headers: req.headers,
      });
      if (session?.user?.id) {
        userId = session.user.id;
      }
    } catch {
      // Unauthenticated
    }

    if (!userId) {
      return errorResponse('Authentication required to reset learning memory', 401);
    }

    const reset = await resetUserMemory(userId);
    return successResponse(reset, 'Learning memory profile has been reset to defaults');
  } catch (err) {
    console.error('[Memory API DELETE Error]:', err);
    return errorResponse(err instanceof Error ? err.message : 'Failed to reset memory profile', 500);
  }
}
