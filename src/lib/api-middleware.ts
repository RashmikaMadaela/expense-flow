import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import type { Session } from 'next-auth';

/**
 * Authentication middleware for API routes
 */
export async function requireAuth(): Promise<Session | NextResponse> {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }
  
  return session;
}

/**
 * API Response wrapper with consistent structure
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export function createApiResponse<T>(
  data: T,
  message?: string
): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    message,
  } as ApiResponse<T>);
}

export function createApiError(
  message: string,
  status: number = 400
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
    } as ApiResponse,
    { status }
  );
}

/**
 * Validation middleware for request bodies
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<{ data: T; error?: NextResponse }> {
  try {
    const body = await request.json();
    const validatedData = schema.parse(body);
    return { data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        data: {} as T,
        error: createApiError(
          `Validation error: ${error.issues.map((issue) => issue.message).join(', ')}`,
          400
        ),
      };
    }
    return {
      data: {} as T,
      error: createApiError('Invalid request body', 400),
    };
  }
}

/**
 * Handle API method routing
 */
export function createMethodHandler(handlers: {
  GET?: (request: NextRequest, context?: { params: Promise<Record<string, string>> }) => Promise<NextResponse>;
  POST?: (request: NextRequest, context?: { params: Promise<Record<string, string>> }) => Promise<NextResponse>;
  PUT?: (request: NextRequest, context?: { params: Promise<Record<string, string>> }) => Promise<NextResponse>;
  DELETE?: (request: NextRequest, context?: { params: Promise<Record<string, string>> }) => Promise<NextResponse>;
  PATCH?: (request: NextRequest, context?: { params: Promise<Record<string, string>> }) => Promise<NextResponse>;
}) {
  return async (request: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    const method = request.method as keyof typeof handlers;
    
    if (!(method in handlers)) {
      return createApiError(`Method ${method} not allowed`, 405);
    }
    
    try {
      return await handlers[method]!(request, context);
    } catch (error) {
      console.error('API Error:', error);
      return createApiError('Internal server error', 500);
    }
  };
}

/**
 * Extract user ID from authenticated session
 */
export function getUserId(session: Session): string {
  return session.user.id;
}