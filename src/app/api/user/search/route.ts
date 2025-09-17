import { NextRequest } from 'next/server';
import {
  requireAuth,
  createApiResponse,
  createApiError,
  createMethodHandler,
  getUserId,
} from '@/lib/api-middleware';
import { prisma } from '@/lib/prisma';
import { SearchUsersSchema } from '@/lib/validations';
import type { Session } from 'next-auth';

async function handleSearchUsers(request: NextRequest) {
  const authResult = await requireAuth();
  
  if (authResult instanceof Response) {
    return authResult; // Auth failed
  }
  
  const session = authResult as Session;
  const userId = getUserId(session);
  
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('query');
    const limit = url.searchParams.get('limit');
    
    const validationResult = SearchUsersSchema.safeParse({
      query,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    
    if (!validationResult.success) {
      return createApiError(
        `Validation error: ${validationResult.error.issues.map(issue => issue.message).join(', ')}`,
        400
      );
    }
    
    const { query: searchQuery, limit: searchLimit } = validationResult.data;
    
    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: userId } }, // Exclude current user
          {
            OR: [
              { name: { contains: searchQuery, mode: 'insensitive' } },
              { email: { contains: searchQuery, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
      take: searchLimit,
    });

    return createApiResponse(users, `Found ${users.length} users`);
  } catch (error) {
    console.error('Error searching users:', error);
    return createApiError('Failed to search users', 500);
  }
}

export const GET = createMethodHandler({
  GET: handleSearchUsers,
});