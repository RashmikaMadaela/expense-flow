import { NextRequest } from 'next/server';
import {
  requireAuth,
  createApiResponse,
  createApiError,
  validateRequestBody,
  getUserId,
} from '@/lib/api-middleware';
import { prisma } from '@/lib/prisma';
import { RespondFriendRequestSchema } from '@/lib/validations';
import type { Session } from 'next-auth';

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
  
  const { data: responseData, error } = await validateRequestBody(
    request,
    RespondFriendRequestSchema
  );
  
  if (error) return error;
  
  try {
    const { id } = await params;
    // Find the friend request
    const friendRequest = await prisma.friendRequest.findFirst({
      where: {
        id: id,
        receiverId: userId, // Only the receiver can respond
        status: 'PENDING',
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true, image: true },
        },
        receiver: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    if (!friendRequest) {
      return createApiError('Friend request not found or unauthorized', 404);
    }

    // Update the friend request status
    const updatedRequest = await prisma.friendRequest.update({
      where: { id: id },
      data: {
        status: responseData.accept ? 'ACCEPTED' : 'REJECTED',
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true, image: true },
        },
        receiver: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    const message = responseData.accept 
      ? 'Friend request accepted' 
      : 'Friend request rejected';

    return createApiResponse(updatedRequest, message);
  } catch (error) {
    console.error('Error responding to friend request:', error);
    return createApiError('Failed to respond to friend request', 500);
  }
}