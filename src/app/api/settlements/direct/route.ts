import { NextRequest } from 'next/server';
import {
  requireAuth,
  createApiResponse,
  createApiError,
  getUserId,
  validateRequestBody,
} from '@/lib/api-middleware';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import type { Session } from 'next-auth';

const directSettlementSchema = z.object({
  toUserId: z.string().cuid(),
  amount: z.number().positive(),
});

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    
    if (authResult instanceof Response) {
      return authResult; // Auth failed
    }
    
    const session = authResult as Session;
    const userId = getUserId(session);

    const validationResult = await validateRequestBody(request, directSettlementSchema);
    
    if (validationResult.error) {
      return validationResult.error; // Validation failed
    }
    
    const { toUserId, amount } = validationResult.data!;

    // Verify the recipient exists
    const recipientUser = await prisma.user.findUnique({
      where: { id: toUserId },
    });

    if (!recipientUser) {
      return createApiError('Recipient not found', 404);
    }

    // Cannot settle with yourself
    if (userId === toUserId) {
      return createApiError('Cannot settle with yourself', 400);
    }

    // Get current user's name for the expense description
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true }
    });
    const currentUserName = currentUser?.name || 'Unknown User';

    const recipientName = recipientUser?.name || 'Unknown User';

    // Use a transaction to create settlement expense records for both parties
    const result = await prisma.$transaction(async (tx) => {
      // Create negative expense for the receiver (A gets a negative expense when B pays them)
      const receiverSettlementExpense = await tx.expense.create({
        data: {
          description: `Settlement received from ${recipientName}`,
          amount: -amount, // Negative amount indicates money received
          currency: 'LKR',
          date: new Date(),
          createdBy: userId, // A (receiver) gets this negative expense
          category: 'Settlement',
          participants: {
            create: [
              {
                userId: userId,
                share: -amount, // Negative share indicates money received
              }
            ]
          }
        },
        include: {
          participants: true
        }
      });

      // Create positive expense for the payer (B gets a positive expense when they pay)
      const payerSettlementExpense = await tx.expense.create({
        data: {
          description: `Settlement paid to ${currentUserName}`,
          amount: amount, // Positive amount indicates money paid out
          currency: 'LKR',
          date: new Date(),
          createdBy: toUserId, // B (payer) gets this positive expense
          category: 'Settlement',
          participants: {
            create: [
              {
                userId: toUserId,
                share: amount, // Positive share indicates money paid out
              }
            ]
          }
        },
        include: {
          participants: true
        }
      });

      return { receiverSettlementExpense, payerSettlementExpense };
    });

    return createApiResponse({
      success: true,
      message: 'Settlement processed successfully',
      receiverExpense: result.receiverSettlementExpense,
      payerExpense: result.payerSettlementExpense,
      totalAmount: amount,
    });

  } catch (error) {
    console.error('Error processing direct settlement:', error);
    return createApiError('Internal server error', 500);
  }
}