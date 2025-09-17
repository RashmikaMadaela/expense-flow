import { NextRequest } from 'next/server';
import {
  requireAuth,
  createApiResponse,
  createApiError,
  createMethodHandler,
  validateRequestBody,
  getUserId,
} from '@/lib/api-middleware';
import { prisma } from '@/lib/prisma';
import { CreateGroupSchema } from '@/lib/validations';
import type { Session } from 'next-auth';

async function handleCreateGroup(request: NextRequest) {
  const authResult = await requireAuth();
  
  if (authResult instanceof Response) {
    return authResult; // Auth failed
  }
  
  const session = authResult as Session;
  const userId = getUserId(session);
  
  const { data: groupData, error } = await validateRequestBody(
    request,
    CreateGroupSchema
  );
  
  if (error) return error;
  
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Create the group
      const group = await tx.group.create({
        data: {
          name: groupData.name,
          description: groupData.description,
        },
      });

      // Add creator as the first member
      await tx.groupMember.create({
        data: {
          groupId: group.id,
          userId,
          role: 'ADMIN',
        },
      });

      // Add additional members if provided
      if (groupData.members && groupData.members.length > 0) {
        await tx.groupMember.createMany({
          data: groupData.members.map(memberId => ({
            groupId: group.id,
            userId: memberId,
            role: 'MEMBER' as const,
          })),
        });
      }

      // Return the created group with members
      return await tx.group.findUnique({
        where: { id: group.id },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true },
              },
            },
          },
          _count: {
            select: {
              expenses: true,
              members: true,
            },
          },
        },
      });
    });

    return createApiResponse(result, 'Group created successfully');
  } catch (error) {
    console.error('Error creating group:', error);
    return createApiError('Failed to create group', 500);
  }
}

async function handleGetGroups(request: NextRequest) {
  const authResult = await requireAuth();
  
  if (authResult instanceof Response) {
    return authResult; // Auth failed
  }
  
  const session = authResult as Session;
  const userId = getUserId(session);
  
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);
    
    const [groups, total] = await Promise.all([
      prisma.group.findMany({
        where: {
          members: {
            some: { userId },
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true },
              },
            },
            take: 5, // Limit member preview
          },
          _count: {
            select: {
              expenses: true,
              members: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.group.count({
        where: {
          members: {
            some: { userId },
          },
        },
      }),
    ]);
    
    return createApiResponse(
      {
        groups,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
      'Groups retrieved successfully'
    );
  } catch (error) {
    console.error('Error fetching groups:', error);
    return createApiError('Failed to fetch groups', 500);
  }
}

export const POST = createMethodHandler({
  POST: handleCreateGroup,
});

export const GET = createMethodHandler({
  GET: handleGetGroups,
});