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
import { SendFriendRequestSchema } from '@/lib/validations';
import type { Session } from 'next-auth';

async function handleSendFriendRequest(request: NextRequest) {
  const authResult = await requireAuth();
  
  if (authResult instanceof Response) {
    return authResult; // Auth failed
  }
  
  const session = authResult as Session;
  const userId = getUserId(session);
  
  const { data: requestData, error } = await validateRequestBody(
    request,
    SendFriendRequestSchema
  );
  
  if (error) return error;
  
  try {
    // Can't send friend request to yourself
    if (requestData.friendId === userId) {
      return createApiError('Cannot send friend request to yourself', 400);
    }

    // Check if the target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: requestData.friendId },
      select: { id: true, name: true, email: true, image: true },
    });

    if (!targetUser) {
      return createApiError('User not found', 404);
    }

    // Check if they are already friends
    const existingFriendship = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId: requestData.friendId, status: 'ACCEPTED' },
          { senderId: requestData.friendId, receiverId: userId, status: 'ACCEPTED' },
        ],
      },
    });

    if (existingFriendship) {
      return createApiError('You are already friends with this user', 400);
    }

    // Check if there's already a pending request
    const existingRequest = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId: requestData.friendId, status: 'PENDING' },
          { senderId: requestData.friendId, receiverId: userId, status: 'PENDING' },
        ],
      },
    });

    if (existingRequest) {
      return createApiError('Friend request already exists', 400);
    }

    // Create the friend request
    const friendRequest = await prisma.friendRequest.create({
      data: {
        senderId: userId,
        receiverId: requestData.friendId,
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

    return createApiResponse(friendRequest, 'Friend request sent successfully');
  } catch (error) {
    console.error('Error sending friend request:', error);
    return createApiError('Failed to send friend request', 500);
  }
}

async function handleGetFriendRequests(request: NextRequest) {
  const authResult = await requireAuth();
  
  if (authResult instanceof Response) {
    return authResult; // Auth failed
  }
  
  const session = authResult as Session;
  const userId = getUserId(session);
  
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'received'; // 'sent' or 'received'
    const status = url.searchParams.get('status') || 'PENDING';
    
    const whereClause = {
      status: status as 'PENDING' | 'ACCEPTED' | 'REJECTED',
      ...(type === 'sent' 
        ? { senderId: userId } 
        : { receiverId: userId }
      ),
    };
    
    const friendRequests = await prisma.friendRequest.findMany({
      where: whereClause,
      include: {
        sender: {
          select: { id: true, name: true, email: true, image: true },
        },
        receiver: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return createApiResponse(friendRequests, 'Friend requests retrieved successfully');
  } catch (error) {
    console.error('Error fetching friend requests:', error);
    return createApiError('Failed to fetch friend requests', 500);
  }
}

export const POST = createMethodHandler({
  POST: handleSendFriendRequest,
});

export const GET = createMethodHandler({
  GET: handleGetFriendRequests,
});