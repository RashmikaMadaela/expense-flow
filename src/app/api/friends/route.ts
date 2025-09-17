import {
  requireAuth,
  createApiResponse,
  createApiError,
  createMethodHandler,
  getUserId,
} from '@/lib/api-middleware';
import { prisma } from '@/lib/prisma';
import type { Session } from 'next-auth';

async function handleGetFriends() {
  const authResult = await requireAuth();
  
  if (authResult instanceof Response) {
    return authResult; // Auth failed
  }
  
  const session = authResult as Session;
  const userId = getUserId(session);
  
  try {
    // Get all accepted friend requests where user is either sender or receiver
    const friendRequests = await prisma.friendRequest.findMany({
      where: {
        OR: [
          { senderId: userId, status: 'ACCEPTED' },
          { receiverId: userId, status: 'ACCEPTED' },
        ],
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

    // Transform to get friend objects (the other person in each relationship)
    const friends = friendRequests.map(request => {
      const friend = request.senderId === userId ? request.receiver : request.sender;
      return {
        id: friend.id,
        name: friend.name,
        email: friend.email,
        image: friend.image,
        friendshipDate: request.updatedAt, // When they became friends
      };
    });

    return createApiResponse(friends, 'Friends retrieved successfully');
  } catch (error) {
    console.error('Error fetching friends:', error);
    return createApiError('Failed to fetch friends', 500);
  }
}

export const GET = createMethodHandler({
  GET: handleGetFriends,
});