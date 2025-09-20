import { NextRequest } from 'next/server';
import {
  requireAuth,
  createApiResponse,
  createApiError,
  getUserId,
} from '@/lib/api-middleware';
import { prisma } from '@/lib/prisma';
import type { Session } from 'next-auth';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    
    if (authResult instanceof Response) {
      return authResult; // Auth failed
    }
    
    const session = authResult as Session;
    const userId = getUserId(session);

    const { toUserId, amount, message } = await request.json();

    if (!toUserId || !amount) {
      return createApiError('Missing required fields: toUserId and amount', 400);
    }

    if (amount <= 0) {
      return createApiError('Amount must be positive', 400);
    }

    if (toUserId === userId) {
      return createApiError('Cannot send settlement request to yourself', 400);
    }

    // Verify the recipient exists
    const recipient = await prisma.user.findUnique({
      where: { id: toUserId },
      select: { id: true, name: true }
    });

    if (!recipient) {
      return createApiError('Recipient not found', 404);
    }

    // Check if there's already a pending request between these users
    const existingRequest = await prisma.settlementRequest.findFirst({
      where: {
        senderId: userId,
        receiverId: toUserId,
        status: 'PENDING'
      }
    });

    if (existingRequest) {
      return createApiError('You already have a pending settlement request with this user', 400);
    }

    // Amount is already in cents from the frontend
    const amountInCents = Math.round(amount);

    // Create the settlement request
    const settlementRequest = await prisma.settlementRequest.create({
      data: {
        senderId: userId,
        receiverId: toUserId,
        amount: amountInCents,
        message: message || null,
        status: 'PENDING'
      },
      include: {
        sender: {
          select: { id: true, name: true, image: true }
        },
        receiver: {
          select: { id: true, name: true, image: true }
        }
      }
    });

    return createApiResponse(settlementRequest, 'Settlement request sent successfully');

  } catch (error) {
    console.error('Error sending settlement request:', error);
    return createApiError('Internal server error', 500);
  }
}