import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const table = searchParams.get('table') || 'users';
    
    let data;
    
    switch (table.toLowerCase()) {
      case 'users':
        data = await prisma.user.findMany({
          take: 10,
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            createdAt: true,
            _count: {
              select: {
                createdExpenses: true,
                participations: true,
              }
            }
          }
        });
        break;
        
      case 'expenses':
        data = await prisma.expense.findMany({
          take: 10,
          where: {
            deletedAt: null
          },
          select: {
            id: true,
            description: true,
            amount: true,
            currency: true,
            category: true,
            date: true,
            createdAt: true,
            creator: {
              select: {
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
        break;
        
      case 'stats':
        const userCount = await prisma.user.count();
        const expenseCount = await prisma.expense.count({
          where: { deletedAt: null }
        });
        const totalAmount = await prisma.expense.aggregate({
          where: { deletedAt: null },
          _sum: { amount: true }
        });
        
        data = {
          users: userCount,
          expenses: expenseCount,
          totalAmount: totalAmount._sum.amount ? totalAmount._sum.amount / 100 : 0,
          currency: 'USD'
        };
        break;
        
      default:
        return NextResponse.json({ error: 'Invalid table name' }, { status: 400 });
    }

    return NextResponse.json({
      table,
      count: Array.isArray(data) ? data.length : 1,
      data
    });
    
  } catch (error) {
    console.error('Database debug error:', error);
    return NextResponse.json({ 
      error: 'Database query failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}