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
      return createApiError('You can only accept settlement requests sent to you', 403);
    }

    // Check if request is still pending
    if (settlementRequest.status !== 'PENDING') {
      return createApiError('Settlement request is no longer pending', 400);
    }

    // Use a transaction to update settlement status and create settlement expense records
    const result = await prisma.$transaction(async (tx) => {
      // Update the settlement request status to accepted
      const updatedSettlement = await tx.settlementRequest.update({
        where: { id },
        data: {
          status: 'ACCEPTED',
          updatedAt: new Date(),
        },
        include: {
          sender: true,
          receiver: true,
        },
      });

      // Get current user's name for the expense description
      const currentUser = await tx.user.findUnique({
        where: { id: userId },
        select: { name: true }
      });
      const currentUserName = currentUser?.name || 'Unknown User';
      const senderName = settlementRequest.sender.name;

      // Create negative expense for the receiver (current user gets money)
      const receiverSettlementExpense = await tx.expense.create({
        data: {
          description: `Settlement received from ${senderName}`,
          amount: -settlementRequest.amount, // Negative amount indicates money received
          currency: 'LKR',
          date: new Date(),
          createdBy: userId, // Receiver gets this negative expense
          category: 'Settlement',
          participants: {
            create: [
              {
                userId: userId,
                share: -settlementRequest.amount, // Negative share indicates money received
              }
            ]
          }
        },
        include: {
          participants: true
        }
      });

      // Create positive expense for the sender (sender pays money)
      const payerSettlementExpense = await tx.expense.create({
        data: {
          description: `Settlement paid to ${currentUserName}`,
          amount: settlementRequest.amount, // Positive amount indicates money paid out
          currency: 'LKR',
          date: new Date(),
          createdBy: settlementRequest.senderId, // Sender gets this positive expense
          category: 'Settlement',
          participants: {
            create: [
              {
                userId: settlementRequest.senderId,
                share: settlementRequest.amount, // Positive share indicates money paid out
              }
            ]
          }
        },
        include: {
          participants: true
        }
      });

      return { updatedSettlement, receiverSettlementExpense, payerSettlementExpense };
    });

    return createApiResponse({
      message: 'Settlement request accepted successfully',
      settlement: result.updatedSettlement,
      receiverExpense: result.receiverSettlementExpense,
      payerExpense: result.payerSettlementExpense,
    });

  } catch (error) {
    console.error('Error accepting settlement request:', error);
    return createApiError('Internal server error', 500);
  }
}