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
  
  if (!expenseData) {
    return createApiError('Validation failed', 400);
  }
  
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
        },
      });

      // Calculate participant amounts based on split type
      let participantData: { userId?: string; customName?: string; amount: number }[] = [];
      
      // If no participants provided, this is a personal expense
      if (!expenseData.participants || expenseData.participants.length === 0) {
        // No participants to create for personal expenses
        participantData = [];
      } else if (expenseData.splitType === 'EQUAL') {
        // For shared expenses, always include the owner in the split
        const allParticipants = [...expenseData.participants];
        const ownerAlreadyIncluded = allParticipants.some(p => p.userId === userId);
        
        if (!ownerAlreadyIncluded) {
          // Add the owner as a participant
          allParticipants.unshift({ userId: userId });
        }
        
        const totalParticipants = allParticipants.length;
        const equalAmounts = calculateEqualSplit(amountInCents, totalParticipants);
        participantData = allParticipants.map((p, index) => ({
          userId: p.userId,
          customName: p.customName,
          amount: equalAmounts[index],
        }));
      } else if (expenseData.splitType === 'EXACT') {
        // For exact split, use the provided amounts
        participantData = expenseData.participants.map(p => ({
          userId: p.userId,
          customName: p.customName,
          amount: Math.round((p.amount || 0) * 100), // Convert to cents
        }));
        
        // Validate that amounts add up to total
        const totalParticipantAmount = participantData.reduce(
          (sum, p) => sum + p.amount,
          0
        );
        if (Math.abs(totalParticipantAmount - amountInCents) > 1) { // Allow 1 cent difference for rounding
          throw new Error(`Participant amounts (${totalParticipantAmount/100}) do not match total expense amount (${amountInCents/100})`);
        }
      } else {
        throw new Error('Percentage split not yet implemented');
      }

      // Create expense participants only if there are any
      if (participantData.length > 0) {
        for (const { userId, customName, amount } of participantData) {
          if (userId) {
            // Create participant with registered user
            await tx.expenseParticipant.create({
              data: {
                expenseId: expense.id,
                userId: userId,
                share: amount,
              },
            });
          } else if (customName) {
            // Create participant with custom name (use raw query temporarily)
            await tx.$executeRaw`
              INSERT INTO expense_participants (id, "expenseId", "customName", share, status, "createdAt", "updatedAt")
              VALUES (gen_random_uuid(), ${expense.id}, ${customName}, ${amount}, 'PENDING', NOW(), NOW())
            `;
          }
        }
      }

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
      groupId: url.searchParams.get('groupId') || undefined,
      limit: url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!, 10) : undefined,
      offset: url.searchParams.get('offset') ? parseInt(url.searchParams.get('offset')!, 10) : undefined,
      startDate: url.searchParams.get('startDate') || undefined,
      endDate: url.searchParams.get('endDate') || undefined,
    };
    
    const validationResult = GetExpensesSchema.safeParse(queryParams);
    
    if (!validationResult.success) {
      return createApiError(
        `Validation error: ${validationResult.error.issues.map(issue => issue.message).join(', ')}`,
        400
      );
    }
    
    const { limit, offset, startDate, endDate } = validationResult.data;
    
    // Build where clause
    const whereClause = {
      deletedAt: null, // Only return non-deleted expenses
      OR: [
        { createdBy: userId },
        { participants: { some: { userId } } },
      ],
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