import {
  requireAuth,
  createApiResponse,
  createApiError,
  getUserId,
} from '@/lib/api-middleware';
import { prisma } from '@/lib/prisma';
import type { Session } from 'next-auth';

export async function GET() {
  try {
    const authResult = await requireAuth();
    
    if (authResult instanceof Response) {
      return authResult; // Auth failed
    }
    
    const session = authResult as Session;
    const userId = getUserId(session);

    // Get settlement requests where the current user is the receiver (incoming requests)
    const pendingRequests = await prisma.settlementRequest.findMany({
      where: {
        receiverId: userId,
        status: 'PENDING'
      },
      include: {
        sender: {
          select: { id: true, name: true, image: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Transform to match the expected format
    const formattedRequests = pendingRequests.map(request => ({
      id: request.id,
      fromUserId: request.senderId,
      toUserId: request.receiverId,
      amount: request.amount, // Already in cents
      status: 'pending' as const,
      createdAt: request.createdAt.toISOString(),
      fromUser: {
        name: request.sender.name || 'Unknown',
        image: request.sender.image
      },
      toUser: {
        name: session.user.name || 'Unknown',
        image: session.user.image
      },
      message: request.message
    }));

    return createApiResponse(formattedRequests, 'Pending settlement requests retrieved successfully');

  } catch (error) {
    console.error('Error fetching pending settlements:', error);
    return createApiError('Internal server error', 500);
  }
}