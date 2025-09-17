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
import { CreateExpenseSchema, GetExpensesSchema } from '@/lib/validations';
import { calculateEqualSplit } from '@/lib/utils';
import type { Session } from 'next-auth';

async function handleCreateExpense(request: NextRequest) {
  const authResult = await requireAuth();
  
  if (authResult instanceof Response) {
    return authResult; // Auth failed
  }
  
  const session = authResult as Session;
  const userId = getUserId(session);
  
  const { data: expenseData, error } = await validateRequestBody(
    request,
    CreateExpenseSchema
  );
  
  if (error) return error;
  
  try {
    // Convert amount to cents for storage
    const amountInCents = Math.round(expenseData.amount * 100);
    
    const result = await prisma.$transaction(async (tx) => {
      // Create the expense
      const expense = await tx.expense.create({
        data: {
          description: expenseData.description,
          amount: amountInCents,
          category: expenseData.category || 'Other',
          notes: expenseData.notes,
          createdBy: userId,
          groupId: expenseData.groupId,
        },
      });

      // Calculate participant amounts based on split type
      let participantAmounts: { userId: string; amount: number }[];
      
      if (expenseData.splitType === 'EQUAL') {
        const userIds = expenseData.participants.map(p => p.userId);
        const equalAmounts = calculateEqualSplit(amountInCents, userIds.length);
        participantAmounts = userIds.map((userId, index) => ({
          userId,
          amount: equalAmounts[index],
        }));
      } else if (expenseData.splitType === 'EXACT') {
        participantAmounts = expenseData.participants.map(p => ({
          userId: p.userId,
          amount: Math.round((p.amount || 0) * 100), // Convert to cents
        }));
        
        // Validate that amounts add up
        const totalParticipantAmount = participantAmounts.reduce(
          (sum, p) => sum + p.amount,
          0
        );
        if (totalParticipantAmount !== amountInCents) {
          throw new Error('Participant amounts do not add up to total expense amount');
        }
      } else {
        throw new Error('Percentage split not yet implemented');
      }

      // Create expense participants
      await tx.expenseParticipant.createMany({
        data: participantAmounts.map(({ userId: participantId, amount }) => ({
          expenseId: expense.id,
          userId: participantId,
          share: amount,
        })),
      });

      // Return the created expense with participants
      return await tx.expense.findUnique({
        where: { id: expense.id },
        include: {
          creator: {
            select: { id: true, name: true, email: true, image: true },
          },
          participants: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true },
              },
            },
          },
          group: {
            select: { id: true, name: true },
          },
        },
      });
    });

    return createApiResponse(result, 'Expense created successfully');
  } catch (error) {
    console.error('Error creating expense:', error);
    return createApiError(
      error instanceof Error ? error.message : 'Failed to create expense',
      500
    );
  }
}

async function handleGetExpenses(request: NextRequest) {
  const authResult = await requireAuth();
  
  if (authResult instanceof Response) {
    return authResult; // Auth failed
  }
  
  const session = authResult as Session;
  const userId = getUserId(session);
  
  try {
    const url = new URL(request.url);
    const queryParams = {
      groupId: url.searchParams.get('groupId'),
      limit: url.searchParams.get('limit'),
      offset: url.searchParams.get('offset'),
      startDate: url.searchParams.get('startDate'),
      endDate: url.searchParams.get('endDate'),
    };
    
    const validationResult = GetExpensesSchema.safeParse({
      ...queryParams,
      limit: queryParams.limit ? parseInt(queryParams.limit, 10) : undefined,
      offset: queryParams.offset ? parseInt(queryParams.offset, 10) : undefined,
    });
    
    if (!validationResult.success) {
      return createApiError(
        `Validation error: ${validationResult.error.issues.map(issue => issue.message).join(', ')}`,
        400
      );
    }
    
    const { groupId, limit, offset, startDate, endDate } = validationResult.data;
    
    // Build where clause
    const whereClause = {
      OR: [
        { createdBy: userId },
        { participants: { some: { userId } } },
      ],
      ...(groupId && { groupId }),
      ...(startDate || endDate) && {
        date: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        },
      },
    };
    
    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where: whereClause,
        include: {
          creator: {
            select: { id: true, name: true, email: true, image: true },
          },
          participants: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true },
              },
            },
          },
          group: {
            select: { id: true, name: true },
          },
        },
        orderBy: { date: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.expense.count({ where: whereClause }),
    ]);
    
    return createApiResponse(
      {
        expenses,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
      'Expenses retrieved successfully'
    );
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return createApiError('Failed to fetch expenses', 500);
  }
}

export const POST = createMethodHandler({
  POST: handleCreateExpense,
});

export const GET = createMethodHandler({
  GET: handleGetExpenses,
});