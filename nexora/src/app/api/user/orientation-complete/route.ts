import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { user } from '@/db/schema/auth';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user?.id) {
      return errorResponse('Unauthorized', 401);
    }

    await db
      .update(user)
      .set({
        onboardingCompleted: true,
        updatedAt: new Date(),
      })
      .where(eq(user.id, session.user.id));

    return successResponse(
      { onboardingCompleted: true },
      'Orientation marked as completed'
    );
  } catch (error) {
    console.error('POST /api/user/orientation-complete error:', error);
    return errorResponse('Failed to update orientation status', 500);
  }
}
