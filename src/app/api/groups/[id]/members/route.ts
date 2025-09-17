import { NextRequest } from 'next/server';
import {
  requireAuth,
  createApiResponse,
  createApiError,
  validateRequestBody,
  getUserId,
} from '@/lib/api-middleware';
import { prisma } from '@/lib/prisma';
import { AddGroupMemberSchema } from '@/lib/validations';
import type { Session } from 'next-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth();
  
  if (authResult instanceof Response) {
    return authResult; // Auth failed
  }
  
  const session = authResult as Session;
  const userId = getUserId(session);
  
  const { data: memberData, error } = await validateRequestBody(
    request,
    AddGroupMemberSchema
  );
  
  if (error) return error;
  
  try {
    // Check if user is admin of the group
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: params.id,
        userId,
        role: 'ADMIN',
      },
    });

    if (!membership) {
      return createApiError('Not authorized to add members to this group', 403);
    }

    // Check if the user to be added exists
    const userToAdd = await prisma.user.findUnique({
      where: { id: memberData.userId },
      select: { id: true, name: true, email: true, image: true },
    });

    if (!userToAdd) {
      return createApiError('User not found', 404);
    }

    // Check if user is already a member
    const existingMembership = await prisma.groupMember.findFirst({
      where: {
        groupId: params.id,
        userId: memberData.userId,
      },
    });

    if (existingMembership) {
      return createApiError('User is already a member of this group', 400);
    }

    // Add the member
    const newMember = await prisma.groupMember.create({
      data: {
        groupId: params.id,
        userId: memberData.userId,
        role: 'MEMBER',
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    return createApiResponse(newMember, 'Member added successfully');
  } catch (error) {
    console.error('Error adding group member:', error);
    return createApiError('Failed to add member', 500);
  }
}