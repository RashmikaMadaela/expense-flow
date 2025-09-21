import {
  requireAuth,
  createApiResponse,
  createApiError,
  createMethodHandler,
  getUserId,
} from '@/lib/api-middleware';
import { prisma } from '@/lib/prisma';
import type { Session } from 'next-auth';

async function handleGetProfile() {
  const authResult = await requireAuth();
  
  if (authResult instanceof Response) {
    return authResult; // Auth failed
  }
  
  const session = authResult as Session;
  const userId = getUserId(session);
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            createdExpenses: true,
            participations: true,
            sentFriendRequests: true,
            receivedFriendRequests: true,
          },
        },
      },
    });

    if (!user) {
      return createApiError('User not found', 404);
    }

    return createApiResponse(user, 'Profile retrieved successfully');
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return createApiError('Failed to fetch profile', 500);
  }
}

export const GET = createMethodHandler({
  GET: handleGetProfile,
});