import { NextRequest } from 'next/server';
import {
  requireAuth,
  createApiResponse,
  createApiError,
  getUserId,
} from '@/lib/api-middleware';
import { prisma } from '@/lib/prisma';
import type { Session } from 'next-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth();
    
    if (authResult instanceof Response) {
      return authResult; // Auth failed
    }
    
    const session = authResult as Session;
    const userId = getUserId(session);

    const { id } = await params;

    // Find the settlement request
    const settlementRequest = await prisma.settlementRequest.findUnique({
      where: { id },
      include: {
        sender: true,
        receiver: true,
      },
    });

    if (!settlementRequest) {
      return createApiError('Settlement request not found', 404);
    }

    // Verify the current user is the recipient
    if (settlementRequest.receiverId !== userId) {
      return createApiError('You can only reject settlement requests sent to you', 403);
    }

    // Check if request is still pending
    if (settlementRequest.status !== 'PENDING') {
      return createApiError('Settlement request is no longer pending', 400);
    }

    // Update the settlement request status to rejected
    const updatedSettlement = await prisma.settlementRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        updatedAt: new Date(),
      },
      include: {
        sender: true,
        receiver: true,
      },
    });

    return createApiResponse({
      message: 'Settlement request rejected successfully',
      settlement: updatedSettlement,
    });

  } catch (error) {
    console.error('Error rejecting settlement request:', error);
    return createApiError('Internal server error', 500);
  }
}