import { NextRequest } from 'next/server';
import {
  requireAuth,
  createApiResponse,
  createApiError,
  validateRequestBody,
  getUserId,
} from '@/lib/api-middleware';
import { prisma } from '@/lib/prisma';
import { UpdateGroupSchema } from '@/lib/validations';
import type { Session } from 'next-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  
  if (authResult instanceof Response) {
    return authResult; // Auth failed
  }
  
  const session = authResult as Session;
  const userId = getUserId(session);
  
  try {
    const { id } = await params;
    const group = await prisma.group.findFirst({
      where: {
        id: id,
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
          orderBy: { joinedAt: 'asc' },
        },
        expenses: {
          include: {
            creator: {
              select: { id: true, name: true, email: true, image: true },
            },
            participants: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, image: true },
                },
              },
            },
          },
          orderBy: { date: 'desc' },
          take: 10, // Recent expenses
        },
        _count: {
          select: {
            expenses: true,
            members: true,
          },
        },
      },
    });

    if (!group) {
      return createApiError('Group not found', 404);
    }

    return createApiResponse(group, 'Group retrieved successfully');
  } catch (error) {
    console.error('Error fetching group:', error);
    return createApiError('Failed to fetch group', 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  
  if (authResult instanceof Response) {
    return authResult; // Auth failed
  }
  
  const session = authResult as Session;
  const userId = getUserId(session);
  
  const { data: updateData, error } = await validateRequestBody(
    request,
    UpdateGroupSchema
  );
  
  if (error) return error;
  
  if (!updateData) {
    return createApiError('Validation failed', 400);
  }
  
  try {
    const { id } = await params;
    // Check if user is admin of the group
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: id,
        userId,
        role: 'ADMIN',
      },
    });

    if (!membership) {
      return createApiError('Not authorized to update this group', 403);
    }

    const updatedGroup = await prisma.group.update({
      where: { id: id },
      data: {
        ...(updateData.name && { name: updateData.name }),
        ...(updateData.description !== undefined && { description: updateData.description }),
      },
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

    return createApiResponse(updatedGroup, 'Group updated successfully');
  } catch (error) {
    console.error('Error updating group:', error);
    return createApiError('Failed to update group', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  
  if (authResult instanceof Response) {
    return authResult; // Auth failed
  }
  
  const session = authResult as Session;
  const userId = getUserId(session);
  
  try {
    const { id } = await params;
    // Check if user is admin of the group
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: id,
        userId,
        role: 'ADMIN',
      },
    });

    if (!membership) {
      return createApiError('Not authorized to delete this group', 403);
    }

    // Check if group has expenses
    const expenseCount = await prisma.expense.count({
      where: { groupId: id },
    });

    if (expenseCount > 0) {
      return createApiError('Cannot delete group with existing expenses', 400);
    }

    // Delete the group (cascade will handle members)
    await prisma.group.delete({
      where: { id: id },
    });

    return createApiResponse(null, 'Group deleted successfully');
  } catch (error) {
    console.error('Error deleting group:', error);
    return createApiError('Failed to delete group', 500);
  }
}