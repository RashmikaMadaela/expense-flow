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
import { CreateSettlementSchema } from '@/lib/validations';
import type { Session } from 'next-auth';

async function handleCreateSettlement(request: NextRequest) {
  const authResult = await requireAuth();
  
  if (authResult instanceof Response) {
    return authResult; // Auth failed
  }
  
  const session = authResult as Session;
  const userId = getUserId(session);
  
  const { data: settlementData, error } = await validateRequestBody(
    request,
    CreateSettlementSchema
  );
  
  if (error) return error;
  
  try {
    // Verify the payer is the current user (you can only record your own payments)
    if (settlementData.payerId !== userId) {
      return createApiError('You can only record your own payments', 403);
    }

    // Verify both users exist
    const [payer, payee] = await Promise.all([
      prisma.user.findUnique({ where: { id: settlementData.payerId } }),
      prisma.user.findUnique({ where: { id: settlementData.payeeId } }),
    ]);

    if (!payer || !payee) {
      return createApiError('Invalid payer or payee', 400);
    }

    // Convert amount to cents
    const amountInCents = Math.round(settlementData.amount * 100);

    // Create the settlement record
    const settlement = await prisma.settlement.create({
      data: {
        amount: amountInCents,
        paymentMethod: 'MANUAL', // Default payment method
        notes: settlementData.notes,
        payerId: settlementData.payerId,
        expenseId: '', // We'll need to handle this differently since settlements might not be tied to specific expenses
        status: 'PENDING',
      },
      include: {
        payer: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    return createApiResponse(settlement, 'Settlement recorded successfully');
  } catch (error) {
    console.error('Error creating settlement:', error);
    return createApiError('Failed to record settlement', 500);
  }
}

async function handleGetSettlements(request: NextRequest) {
  const authResult = await requireAuth();
  
  if (authResult instanceof Response) {
    return authResult; // Auth failed
  }
  
  const session = authResult as Session;
  const userId = getUserId(session);
  
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);
    
    const whereClause = {
      payerId: userId,
      ...(status && { status: status as 'PENDING' | 'CONFIRMED' | 'REJECTED' }),
    };
    
    const [settlements, total] = await Promise.all([
      prisma.settlement.findMany({
        where: whereClause,
        include: {
          payer: {
            select: { id: true, name: true, email: true, image: true },
          },
          expense: {
            select: { id: true, description: true, amount: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.settlement.count({ where: whereClause }),
    ]);
    
    return createApiResponse(
      {
        settlements,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
      'Settlements retrieved successfully'
    );
  } catch (error) {
    console.error('Error fetching settlements:', error);
    return createApiError('Failed to fetch settlements', 500);
  }
}

export const POST = createMethodHandler({
  POST: handleCreateSettlement,
});

export const GET = createMethodHandler({
  GET: handleGetSettlements,
});