import {
  requireAuth,
  createApiResponse,
  createApiError,
  getUserId,
} from '@/lib/api-middleware';
import { prisma } from '@/lib/prisma';
import type { Session } from 'next-auth';

export async function GET() {
  const authResult = await requireAuth();
  
  if (authResult instanceof Response) {
    return authResult; // Auth failed
  }
  
  const session = authResult as Session;
  const userId = getUserId(session);
  
  try {
    // Get all users except the current user for participant selection
    const users = await prisma.user.findMany({
      where: {
        id: {
          not: userId, // Exclude current user
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return createApiResponse(
      { users },
      'Users retrieved successfully'
    );
  } catch (error) {
    console.error('Error fetching users:', error);
    return createApiError('Failed to fetch users', 500);
  }
}