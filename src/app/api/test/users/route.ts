import { NextRequest } from 'next/server';
import {
  createApiResponse,
  createApiError,
  createMethodHandler,
} from '@/lib/api-middleware';
import { prisma } from '@/lib/prisma';

async function handleGetUsersTest(request: NextRequest) {
  // Only allow in development environment
  if (process.env.NODE_ENV !== 'development') {
    return createApiError('Test endpoints only available in development', 403);
  }

  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '5', 10);
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        _count: {
          select: {
            createdExpenses: true,
            participations: true,
          },
        },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return createApiResponse(users, `Found ${users.length} users`);
  } catch (error) {
    console.error('Error fetching users:', error);
    return createApiError('Failed to fetch users', 500);
  }
}

async function handleCreateTestUser(request: NextRequest) {
  // Only allow in development environment
  if (process.env.NODE_ENV !== 'development') {
    return createApiError('Test endpoints only available in development', 403);
  }

  try {
    const body = await request.json();
    const testUser = await prisma.user.create({
      data: {
        name: body.name || 'Test User',
        email: body.email || `test${Date.now()}@example.com`,
        image: body.image || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
      },
    });

    return createApiResponse(testUser, 'Test user created successfully');
  } catch (error) {
    console.error('Error creating test user:', error);
    return createApiError('Failed to create test user', 500);
  }
}

export const GET = createMethodHandler({
  GET: handleGetUsersTest,
});

export const POST = createMethodHandler({
  POST: handleCreateTestUser,
});