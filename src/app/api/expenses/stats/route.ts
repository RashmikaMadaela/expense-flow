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
    // Include all expenses, both positive (expenses) and negative (settlement income)
    const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0) / 100;
    
    // Separate positive and negative amounts for clearer reporting
    const positiveExpenses = expenses.filter(e => e.amount > 0);
    const negativeExpenses = expenses.filter(e => e.amount < 0);
    
    // Calculate different totals
    const totalExpenses = positiveExpenses.reduce((sum, expense) => sum + expense.amount, 0) / 100; // Actual expenses
    const totalIncome = Math.abs(negativeExpenses.reduce((sum, expense) => sum + expense.amount, 0)) / 100; // Settlement income
    
    // Calculate monthly expenses (including settlements)
    const monthlyExpenses = expenses
      .filter(expense => expense.createdAt >= startOfMonth)
      .reduce((sum, expense) => sum + expense.amount, 0) / 100;
    
    // Get total expense count (including settlements)
    const expenseCount = expenses.length;
    
    // Group expenses by category (including both positive and negative amounts)
    const categories = expenses.reduce((acc, expense) => {
      const category = expense.category || 'other';
      acc[category] = (acc[category] || 0) + (expense.amount / 100);
      return acc;
    }, {} as Record<string, number>);
    
    const stats = {
      totalAmount,     // Total including settlements (net spending)
      totalExpenses,   // Only actual expenses
      totalIncome,     // Settlement income received
      netSpending: totalExpenses - totalIncome, // Net amount spent
      monthlyExpenses, // Monthly total including settlements
      expenseCount,    // Total count including settlements
      categories,      // All categories including settlements
    };

    return createApiResponse(stats, 'Expense statistics retrieved successfully');
  } catch (error) {
    console.error('Error fetching expense statistics:', error);
    return createApiError('Failed to fetch expense statistics', 500);
  }
}