import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getUserMemory,
  upsertUserMemory,
  extractLearningMemoryFromTurns,
} from '@/services/memory';
import { successResponse, errorResponse } from '@/lib/api-response';
import type { MemoryExtractRequest } from '@/types/memory';

export async function POST(req: NextRequest): Promise<Response> {
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

    const body: MemoryExtractRequest = await req.json().catch(() => ({ messages: [] }));
    const { messages = [] } = body;

    if (!messages || messages.length === 0) {
      return successResponse(null, 'No dialogue turns provided for memory extraction');
    }

    // 1. Fetch current profile if user is authenticated
    const existingMemory = userId ? await getUserMemory(userId) : null;

    // 2. Perform cognitive extraction pass
    const extractedUpdates = await extractLearningMemoryFromTurns(messages, existingMemory);

    // 3. Persist updates if authenticated
    let updatedMemory = existingMemory;
    if (userId) {
      updatedMemory = await upsertUserMemory(userId, extractedUpdates);
    }

    return successResponse(
      {
        memory: updatedMemory,
        extractedUpdates,
      },
      'Learning memory successfully extracted and updated'
    );
  } catch (err) {
    console.error('[Memory Extraction API Error]:', err);
    return errorResponse(
      err instanceof Error ? err.message : 'Memory extraction failed',
      500
    );
  }
}
