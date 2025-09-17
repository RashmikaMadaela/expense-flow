import {
  requireAuth,
  createApiResponse,
  createApiError,
  getUserId,
} from '@/lib/api-middleware';
import { prisma } from '@/lib/prisma';
import type { Session } from 'next-auth';

export async function GET(request: Request) {
  const authResult = await requireAuth();
  
  if (authResult instanceof Response) {
    return authResult; // Auth failed
  }
  
  const session = authResult as Session;
  const userId = getUserId(session);
  
  try {
    const url = new URL(request.url);
    const timeframe = url.searchParams.get('timeframe') || 'month';
    
    // Calculate date ranges based on timeframe
    const now = new Date();
    let startDate: Date;
    
    switch (timeframe) {
      case 'quarter':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default: // month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    
    // Get all user's expenses within the timeframe
    const expenses = await prisma.expense.findMany({
      where: {
        createdBy: userId,
        deletedAt: null,
        createdAt: {
          gte: startDate,
          lte: now,
        },
      },
      select: {
        amount: true,
        category: true,
        createdAt: true,
      },
    });
    
    // Calculate basic stats
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0) / 100;
    const expenseCount = expenses.length;
    
    // Group expenses by category
    const categoryTotals = expenses.reduce((acc, expense) => {
      const category = expense.category || 'other';
      acc[category] = (acc[category] || 0) + (expense.amount / 100);
      return acc;
    }, {} as Record<string, number>);
    
    // Create top categories with percentages
    const topCategories = Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        category: category.charAt(0).toUpperCase() + category.slice(1),
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
    
    // Calculate monthly trend (for the past 6 months)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const monthExpenses = expenses.filter(expense => 
        expense.createdAt >= monthStart && expense.createdAt <= monthEnd
      );
      
      const monthTotal = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0) / 100;
      
      monthlyTrend.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        amount: monthTotal,
      });
    }
    
    // Calculate average monthly expenses
    const monthlyExpenses = monthlyTrend.length > 0 
      ? monthlyTrend.reduce((sum, month) => sum + month.amount, 0) / monthlyTrend.length
      : 0;
    
    const reportData = {
      totalExpenses,
      monthlyExpenses,
      expenseCount,
      categories: categoryTotals,
      monthlyTrend,
      topCategories,
      timeframe,
      period: {
        start: startDate.toISOString(),
        end: now.toISOString(),
      },
    };

    return createApiResponse(reportData, 'Report data retrieved successfully');
  } catch (error) {
    console.error('Error generating report:', error);
    return createApiError('Failed to generate report', 500);
  }
}