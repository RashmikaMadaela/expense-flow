import { NextRequest } from 'next/server';
import {
  requireAuth,
  createApiResponse,
  createApiError,
  getUserId,
} from '@/lib/api-middleware';
import { prisma } from '@/lib/prisma';
import type { Session } from 'next-auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  const authResult = await requireAuth();
  
  if (authResult instanceof Response) {
    return authResult; // Auth failed
  }
  
  const session = authResult as Session;
  const currentUserId = getUserId(session);
  
  try {
    // Check if current user is admin of the group or removing themselves
    const currentUserMembership = await prisma.groupMember.findFirst({
      where: {
        groupId: params.id,
        userId: currentUserId,
      },
    });

    if (!currentUserMembership) {
      return createApiError('You are not a member of this group', 403);
    }

    // Check if trying to remove someone else (requires admin)
    if (params.userId !== currentUserId && currentUserMembership.role !== 'ADMIN') {
      return createApiError('Only admins can remove other members', 403);
    }

    // Check if the member to be removed exists
    const memberToRemove = await prisma.groupMember.findFirst({
      where: {
        groupId: params.id,
        userId: params.userId,
      },
    });

    if (!memberToRemove) {
      return createApiError('Member not found in this group', 404);
    }

    // Don't allow removing the last admin
    if (memberToRemove.role === 'ADMIN') {
      const adminCount = await prisma.groupMember.count({
        where: {
          groupId: params.id,
          role: 'ADMIN',
        },
      });

      if (adminCount <= 1) {
        return createApiError('Cannot remove the last admin from the group', 400);
      }
    }

    // Check if member has unsettled expenses in the group
    const unsettledExpenses = await prisma.expenseParticipant.count({
      where: {
        userId: params.userId,
        status: 'PENDING',
        expense: {
          groupId: params.id,
        },
      },
    });

    if (unsettledExpenses > 0) {
      return createApiError('Cannot remove member with unsettled expenses', 400);
    }

    // Remove the member
    await prisma.groupMember.delete({
      where: {
        groupId_userId: {
          groupId: params.id,
          userId: params.userId,
        },
      },
    });

    return createApiResponse(null, 'Member removed successfully');
  } catch (error) {
    console.error('Error removing group member:', error);
    return createApiError('Failed to remove member', 500);
  }
}