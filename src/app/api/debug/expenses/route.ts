import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get all expenses for the user
    const allExpenses = await prisma.expense.findMany({
      where: {
        OR: [
          { createdBy: userId },
          { participants: { some: { userId } } }
        ]
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true }
        },
        participants: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get expenses where user participates specifically
    const participantExpenses = await prisma.expense.findMany({
      where: {
        participants: {
          some: { userId }
        }
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true }
        },
        participants: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        userId,
        allExpenses: allExpenses.map(e => ({
          id: e.id,
          description: e.description,
          amount: e.amount,
          createdBy: e.createdBy,
          isCreator: e.createdBy === userId,
          participants: e.participants.map(p => ({
            id: p.id,
            userId: p.userId,
            customName: p.customName,
            share: p.share,
            userName: p.user?.name
          }))
        })),
        participantExpenses: participantExpenses.map(e => ({
          id: e.id,
          description: e.description,
          amount: e.amount,
          createdBy: e.createdBy,
          isCreator: e.createdBy === userId,
          participants: e.participants.map(p => ({
            id: p.id,
            userId: p.userId,
            customName: p.customName,
            share: p.share,
            userName: p.user?.name
          }))
        }))
      }
    });

  } catch (error) {
    console.error('Debug expenses error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}