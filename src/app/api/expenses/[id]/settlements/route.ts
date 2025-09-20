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
import { z } from 'zod';
import type { Session } from 'next-auth';

// Schema for settlement request
const SettlementRequestSchema = z.object({
  participantId: z.string().uuid('Invalid participant ID'),
  notes: z.string().max(500, 'Notes too long').optional(),
  // Optional fields for owner-initiated settlements
  amount: z.number().positive('Amount must be positive').optional(),
  status: z.enum(['PENDING', 'CONFIRMED']).optional(),
});

// Schema for settlement approval/rejection
const SettlementResponseSchema = z.object({
  settlementId: z.string().uuid('Invalid settlement ID'),
  action: z.enum(['approve', 'reject']),
  notes: z.string().max(500, 'Notes too long').optional(),
});

/**
 * Create a settlement request for an expense participant
 */
async function handleCreateSettlementRequest(request: NextRequest, context?: { params: Promise<Record<string, string>> }) {
  const authResult = await requireAuth();
  
  if (authResult instanceof Response) {
    return authResult;
  }
  
  const session = authResult as Session;
  const userId = getUserId(session);
  
  if (!context?.params) {
    return createApiError('Missing route parameters', 400);
  }
  
  const { id: expenseId } = await context.params;
  
  const { data: requestData, error } = await validateRequestBody(
    request,
    SettlementRequestSchema
  );
  
  if (error) return error;
  
  if (!requestData) {
    return createApiError('Validation failed', 400);
  }
  
  try {
    // Verify the expense exists and get expense details
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        participants: true,
      },
    });
    
    if (!expense) {
      return createApiError('Expense not found', 404);
    }
    
    // Find the participant record
    const participant = await prisma.expenseParticipant.findUnique({
      where: { id: requestData.participantId },
    });
    
    if (!participant) {
      return createApiError('Participant not found', 404);
    }
    
    // Verify the participant belongs to this expense
    if (participant.expenseId !== expenseId) {
      return createApiError('Participant does not belong to this expense', 400);
    }
    
    // Verify the requesting user is either the participant or the expense owner
    const isOwner = expense.createdBy === userId;
    const isParticipant = participant.userId === userId;
    
    if (!isOwner && !isParticipant) {
      return createApiError('You can only request settlement for your own share or manage your own expenses', 403);
    }
    
    // Check if there's already a pending or confirmed settlement for this participant
    const existingSettlement = await prisma.settlement.findFirst({
      where: {
        expenseId: expenseId,
        payerId: participant.userId || '',
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    });
    
    if (existingSettlement) {
      return createApiError('A settlement already exists for this participant', 400);
    }

    // Determine settlement details based on who is creating it
    const settlementAmount = requestData.amount || participant.share;
    const settlementStatus = (isOwner && requestData.status) ? requestData.status : 'PENDING';
    
    // Create the settlement request
    const settlement = await prisma.settlement.create({
      data: {
        amount: settlementAmount,
        paymentMethod: 'DIGITAL', // Default for request-based settlements
        notes: requestData.notes,
        status: settlementStatus,
        expenseId: expenseId,
        payerId: participant.userId || '',
      },
      include: {
        expense: {
          select: { id: true, description: true, amount: true },
        },
        payer: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    // If owner is directly confirming the settlement, update participant status
    if (isOwner && settlementStatus === 'CONFIRMED') {
      await prisma.expenseParticipant.updateMany({
        where: {
          expenseId: expenseId,
          userId: participant.userId,
        },
        data: {
          status: 'PAID',
        },
      });
    }
    
    return createApiResponse(settlement, 'Settlement request created successfully');
  } catch (error) {
    console.error('Error creating settlement request:', error);
    return createApiError('Failed to create settlement request', 500);
  }
}

/**
 * Handle settlement approval/rejection by expense owner
 */
async function handleSettlementResponse(request: NextRequest, context?: { params: Promise<Record<string, string>> }) {
  const authResult = await requireAuth();
  
  if (authResult instanceof Response) {
    return authResult;
  }
  
  const session = authResult as Session;
  const userId = getUserId(session);
  
  if (!context?.params) {
    return createApiError('Missing route parameters', 400);
  }
  
  const { id: expenseId } = await context.params;
  
  const { data: responseData, error } = await validateRequestBody(
    request,
    SettlementResponseSchema
  );
  
  if (error) return error;
  
  if (!responseData) {
    return createApiError('Validation failed', 400);
  }
  
  try {
    // Verify the expense exists and user is the owner
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
    });
    
    if (!expense) {
      return createApiError('Expense not found', 404);
    }
    
    if (expense.createdBy !== userId) {
      return createApiError('Only the expense owner can approve or reject settlements', 403);
    }
    
    // Find the settlement
    const settlement = await prisma.settlement.findUnique({
      where: { id: responseData.settlementId },
      include: {
        payer: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });
    
    if (!settlement) {
      return createApiError('Settlement not found', 404);
    }
    
    // Verify the settlement belongs to this expense
    if (settlement.expenseId !== expenseId) {
      return createApiError('Settlement does not belong to this expense', 400);
    }
    
    // Verify the settlement is in pending status
    if (settlement.status !== 'PENDING') {
      return createApiError('Settlement is not in pending status', 400);
    }
    
    // Update the settlement status
    const updatedSettlement = await prisma.settlement.update({
      where: { id: responseData.settlementId },
      data: {
        status: responseData.action === 'approve' ? 'CONFIRMED' : 'REJECTED',
        confirmedAt: responseData.action === 'approve' ? new Date() : null,
        notes: responseData.notes || settlement.notes,
      },
      include: {
        expense: {
          select: { id: true, description: true, amount: true },
        },
        payer: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });
    
    // If approved, update the participant status to PAID
    if (responseData.action === 'approve') {
      await prisma.expenseParticipant.updateMany({
        where: {
          expenseId: expenseId,
          userId: settlement.payerId,
        },
        data: {
          status: 'PAID',
        },
      });
    }
    
    return createApiResponse(
      updatedSettlement, 
      `Settlement ${responseData.action === 'approve' ? 'approved' : 'rejected'} successfully`
    );
  } catch (error) {
    console.error('Error handling settlement response:', error);
    return createApiError('Failed to process settlement response', 500);
  }
}

/**
 * Get all settlements for an expense
 */
async function handleGetExpenseSettlements(request: NextRequest, context?: { params: Promise<Record<string, string>> }) {
  const authResult = await requireAuth();
  
  if (authResult instanceof Response) {
    return authResult;
  }
  
  const session = authResult as Session;
  const userId = getUserId(session);
  
  if (!context?.params) {
    return createApiError('Missing route parameters', 400);
  }
  
  const { id: expenseId } = await context.params;
  
  try {
    // Verify user has access to this expense (either owner or participant)
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        participants: {
          where: { userId: userId },
        },
      },
    });
    
    if (!expense) {
      return createApiError('Expense not found', 404);
    }
    
    // Check if user is the owner or a participant
    const isOwner = expense.createdBy === userId;
    const isParticipant = expense.participants.length > 0;
    
    if (!isOwner && !isParticipant) {
      return createApiError('You do not have access to this expense', 403);
    }
    
    // Get settlements for this expense
    const settlements = await prisma.settlement.findMany({
      where: { expenseId: expenseId },
      include: {
        payer: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    return createApiResponse(settlements, 'Settlements retrieved successfully');
  } catch (error) {
    console.error('Error fetching expense settlements:', error);
    return createApiError('Failed to fetch settlements', 500);
  }
}

export const POST = createMethodHandler({
  POST: handleCreateSettlementRequest,
});

export const PUT = createMethodHandler({
  PUT: handleSettlementResponse,
});

export const GET = createMethodHandler({
  GET: handleGetExpenseSettlements,
});