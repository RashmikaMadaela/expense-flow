import { NextRequest } from 'next/server';
import {
  requireAuth,
  createApiResponse,
  createApiError,
  validateRequestBody,
  getUserId,
} from '@/lib/api-middleware';
import { prisma } from '@/lib/prisma';
import { UpdateExpenseSchema } from '@/lib/validations';
import type { Session } from 'next-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  
  if (authResult instanceof Response) {
    return authResult; // Auth failed
  }
  
  const session = authResult as Session;
  const userId = getUserId(session);
  
  try {
    const { id } = await params;
    const expense = await prisma.expense.findFirst({
      where: {
        id: id,
        OR: [
          { createdBy: userId },
          { participants: { some: { userId } } },
        ],
      },
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
        settlements: {
          include: {
            payer: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
      },
    });

    if (!expense) {
      return createApiError('Expense not found', 404);
    }

    return createApiResponse(expense, 'Expense retrieved successfully');
  } catch (error) {
    console.error('Error fetching expense:', error);
    return createApiError('Failed to fetch expense', 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  
  if (authResult instanceof Response) {
    return authResult; // Auth failed
  }
  
  const session = authResult as Session;
  const userId = getUserId(session);
  
  const { data: updateData, error } = await validateRequestBody(
    request,
    UpdateExpenseSchema
  );
  
  if (error) return error;
  
  try {
    const { id } = await params;
    // First, verify the user can update this expense (creator only)
    const existingExpense = await prisma.expense.findFirst({
      where: {
        id: id,
        createdBy: userId,
      },
    });

    if (!existingExpense) {
      return createApiError('Expense not found or unauthorized', 404);
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update the expense
      const updateExpenseData: Partial<{
        amount: number;
        description: string;
        category: string;
        notes: string | null;
      }> = {};
      
      if (updateData.amount !== undefined) {
        updateExpenseData.amount = Math.round(updateData.amount * 100);
      }
      if (updateData.description !== undefined) {
        updateExpenseData.description = updateData.description;
      }
      if (updateData.category !== undefined) {
        updateExpenseData.category = updateData.category;
      }
      if (updateData.notes !== undefined) {
        updateExpenseData.notes = updateData.notes;
      }

      await tx.expense.update({
        where: { id: id },
        data: updateExpenseData,
      });

      // Update participants if provided
      if (updateData.participants) {
        // Delete existing participants
        await tx.expenseParticipant.deleteMany({
          where: { expenseId: id },
        });

        // Create new participants
        for (const p of updateData.participants) {
          if (p.userId) {
            await tx.expenseParticipant.create({
              data: {
                expenseId: id,
                userId: p.userId,
                share: p.amount ? Math.round(p.amount * 100) : 0,
              },
            });
          } else if (p.customName) {
            // Use raw query for custom participants until Prisma client is regenerated
            await tx.$executeRaw`
              INSERT INTO expense_participants (id, "expenseId", "customName", share, status, "createdAt", "updatedAt")
              VALUES (gen_random_uuid(), ${id}, ${p.customName}, ${p.amount ? Math.round(p.amount * 100) : 0}, 'PENDING', NOW(), NOW())
            `;
          }
        }
      }

      // Return updated expense with relations
      return await tx.expense.findUnique({
        where: { id: id },
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

    return createApiResponse(result, 'Expense updated successfully');
  } catch (error) {
    console.error('Error updating expense:', error);
    return createApiError('Failed to update expense', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  
  if (authResult instanceof Response) {
    return authResult; // Auth failed
  }
  
  const session = authResult as Session;
  const userId = getUserId(session);
  
  try {
    const { id } = await params;
    // First, verify the user can delete this expense (creator only)
    const existingExpense = await prisma.expense.findFirst({
      where: {
        id: id,
        createdBy: userId,
      },
    });

    if (!existingExpense) {
      return createApiError('Expense not found or unauthorized', 404);
    }

    // Soft delete the expense
    await prisma.expense.update({
      where: { id: id },
      data: { deletedAt: new Date() },
    });

    return createApiResponse(null, 'Expense deleted successfully');
  } catch (error) {
    console.error('Error deleting expense:', error);
    return createApiError('Failed to delete expense', 500);
  }
}