import {
  requireAuth,
  createApiResponse,
  createApiError,
  getUserId,
} from '@/lib/api-middleware';
import { prisma } from '@/lib/prisma';
import type { Session } from 'next-auth';

export async function GET() {
  const authResult = await requireAuth();
  
  if (authResult instanceof Response) {
    return authResult; // Auth failed
  }
  
  const session = authResult as Session;
  const userId = getUserId(session);
  
  try {
    // Get current date for monthly calculation
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Get all user's expenses (not deleted)
    const expenses = await prisma.expense.findMany({
      where: {
        createdBy: userId,
        deletedAt: null,
      },
      select: {
        amount: true,
        category: true,
        createdAt: true,
      },
    });
    
    // Calculate total expenses (in cents, convert to dollars)
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0) / 100;
    
    // Calculate monthly expenses
    const monthlyExpenses = expenses
      .filter(expense => expense.createdAt >= startOfMonth)
      .reduce((sum, expense) => sum + expense.amount, 0) / 100;
    
    // Get expense count
    const expenseCount = expenses.length;
    
    // Group expenses by category
    const categories = expenses.reduce((acc, expense) => {
      const category = expense.category || 'other';
      acc[category] = (acc[category] || 0) + (expense.amount / 100);
      return acc;
    }, {} as Record<string, number>);
    
    const stats = {
      totalExpenses,
      monthlyExpenses,
      expenseCount,
      categories,
    };

    return createApiResponse(stats, 'Expense statistics retrieved successfully');
  } catch (error) {
    console.error('Error fetching expense statistics:', error);
    return createApiError('Failed to fetch expense statistics', 500);
  }
}