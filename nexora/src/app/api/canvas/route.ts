import { NextRequest } from 'next/server';

import { auth } from '@/lib/auth';
import { listUserCanvases, createCanvas } from '@/services/canvas';
import { CreateCanvasSchema, CanvasListQuerySchema } from '@/lib/validators/canvas';
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/api-response';

// GET /api/canvas — List user's canvases
export async function GET(request: NextRequest) {
  try {
    let userId = 'guest-user';
    try {
      const session = await auth.api.getSession({
        headers: request.headers,
      });
      if (session?.user?.id) {
        userId = session.user.id;
      } else {
        const headerId = request.headers.get('x-user-id');
        if (headerId) userId = headerId;
      }
    } catch (authErr) {
      console.warn('[GET /api/canvas]: Session check warning, proceeding with fallback:', authErr);
    }

    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = CanvasListQuerySchema.safeParse(searchParams);

    if (!parsed.success) {
      return validationErrorResponse(
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const result = await listUserCanvases(userId, parsed.data);
    return successResponse(result, 'Canvases retrieved successfully');
  } catch (error) {
    console.error('GET /api/canvas error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to retrieve canvases',
      500,
      { details: [String(error)] }
    );
  }
}

// POST /api/canvas — Create a new canvas
export async function POST(request: NextRequest) {
  try {
    let userId = 'guest-user';
    try {
      const session = await auth.api.getSession({
        headers: request.headers,
      });
      if (session?.user?.id) {
        userId = session.user.id;
      } else {
        const headerId = request.headers.get('x-user-id');
        if (headerId) userId = headerId;
      }
    } catch (authErr) {
      console.warn('[POST /api/canvas]: Session check warning, proceeding with fallback user:', authErr);
    }

    const rawBody: unknown = await request.json();
    let body = (rawBody && typeof rawBody === 'object' ? { ...rawBody } : {}) as Record<string, unknown>;

    // Pre-sanitize empty strings, dashes, or null values for optional fields
    if (typeof body.taskId === 'string' && (!body.taskId.trim() || body.taskId.trim() === '-')) delete body.taskId;
    if (typeof body.description === 'string' && (!body.description.trim() || body.description.trim() === '-')) delete body.description;
    if (typeof body.category === 'string' && (!body.category.trim() || body.category.trim() === '-')) delete body.category;
    if (body.description === null) delete body.description;
    if (body.category === null) delete body.category;
    if (body.taskId === null) delete body.taskId;

    if (body.initialProblem && typeof body.initialProblem === 'object') {
      const ip = { ...(body.initialProblem as Record<string, unknown>) };
      if (typeof ip.statement === 'string' && (!ip.statement.trim() || ip.statement.trim() === '-')) delete ip.statement;
      if (typeof ip.latexFormula === 'string' && (!ip.latexFormula.trim() || ip.latexFormula.trim() === '-')) delete ip.latexFormula;
      if (typeof ip.targetGoal === 'string' && (!ip.targetGoal.trim() || ip.targetGoal.trim() === '-')) delete ip.targetGoal;
      if (ip.statement === null) delete ip.statement;
      if (ip.latexFormula === null) delete ip.latexFormula;
      if (ip.targetGoal === null) delete ip.targetGoal;
      if (ip.variables === null || !Array.isArray(ip.variables)) delete ip.variables;
      body.initialProblem = Object.keys(ip).length > 0 ? ip : undefined;
    }

    const parsed = CreateCanvasSchema.safeParse(body);

    if (!parsed.success) {
      console.warn('[POST /api/canvas]: Validation failed:', parsed.error.flatten().fieldErrors);
      return validationErrorResponse(
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const newCanvas = await createCanvas(userId, parsed.data);
    return successResponse(newCanvas, 'Canvas created successfully', 201);
  } catch (error) {
    console.error('[POST /api/canvas]: Creation error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to create canvas',
      500,
      { details: [String(error)] }
    );
  }
}
