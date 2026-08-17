import { NextResponse } from 'next/server';

import type { ApiResponse } from '@/types/task';

/**
 * Create a successful API response.
 */
export function successResponse<T>(
  data: T,
  message: string = 'Success',
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
    },
    { status }
  );
}

/**
 * Create an error API response.
 */
export function errorResponse(
  message: string,
  status: number = 500,
  errors?: Record<string, string[]>
): NextResponse<ApiResponse<null>> {
  return NextResponse.json(
    {
      success: false,
      data: null,
      message,
      ...(errors && { errors }),
    },
    { status }
  );
}

/**
 * Create a validation error response from Zod errors.
 */
export function validationErrorResponse(
  errors: Record<string, string[]>
): NextResponse<ApiResponse<null>> {
  return errorResponse('Invalid request payload', 400, errors);
}
