import { NextRequest } from 'next/server';

import { auth } from '@/lib/auth';
import { listUserCanvases, createCanvas } from '@/services/canvas';
import { CreateCanvasSchema, CanvasListQuerySchema } from '@/lib/validators/canvas';
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/api-response';

// GET /api/canvas — List user's canvases
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return errorResponse('Unauthorized', 401);
    }

    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = CanvasListQuerySchema.safeParse(searchParams);

    if (!parsed.success) {
      return validationErrorResponse(
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const result = await listUserCanvases(session.user.id, parsed.data);
    return successResponse(result, 'Canvases retrieved successfully');
  } catch (error) {
    console.error('GET /api/canvas error:', error);
    return errorResponse('Failed to retrieve canvases');
  }
}

// POST /api/canvas — Create a new canvas
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return errorResponse('Unauthorized', 401);
    }

    const body: unknown = await request.json();
    const parsed = CreateCanvasSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const newCanvas = await createCanvas(session.user.id, parsed.data);
    return successResponse(newCanvas, 'Canvas created successfully', 201);
  } catch (error) {
    console.error('POST /api/canvas error:', error);
    return errorResponse('Failed to create canvas');
  }
}
