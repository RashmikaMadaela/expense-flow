import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface RelatedExpense {
  id: string;
  description: string;
  amount: number;
  date: string;
  myShare: number;
  settledAmount: number;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get all expenses where the user is involved (either as creator or participant)
    const expenses = await prisma.expense.findMany({
      where: {
        OR: [
          {
            createdBy: userId
          },
          {
            participants: {
              some: {
                userId: userId
              }
            }
          }
        ]
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          }
        },
        settlements: {
          include: {
            payer: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    console.log('Settlement Summary Debug - Found expenses:', expenses.length);
    console.log('Settlement Summary Debug - Expenses:', expenses.map(e => ({
      id: e.id,
      description: e.description,
      amount: e.amount,
      createdBy: e.createdBy,
      isUserCreator: e.createdBy === userId,
      participants: e.participants.map(p => ({
        userId: p.userId,
        customName: p.customName,
        share: p.share,
        isUser: p.userId === userId
      }))
    })));

    // Calculate settlement summaries
    const settlementMap = new Map<string, {
      userId: string;
      userName: string;
      userImage?: string;
      amountOwedToMe: number;
      amountIOwe: number;
      netAmount: number;
      relatedExpenses: RelatedExpense[];
    }>();

    for (const expense of expenses) {
      // Skip settlement expenses (negative amounts) - these are handled separately for reductions
      if (expense.amount < 0 || expense.category === 'Settlement') continue;

      // Calculate settled amount for this expense (from Settlement model)
      const settledAmount = expense.settlements
        .filter(s => s.status === 'CONFIRMED')
        .reduce((sum: number, s) => sum + s.amount, 0);

      // If the expense is fully settled, skip
      if (settledAmount >= expense.amount) continue;

      const userIsCreator = expense.createdBy === userId;
      const userParticipation = expense.participants.find(p => p.userId === userId);
      
      // Skip if user is not involved in this expense at all
      if (!userIsCreator && !userParticipation) continue;

      // Calculate what each participant owes vs what the user paid/owes
      for (const participant of expense.participants) {
        // Skip if it's the user themselves or a custom participant
        if (participant.userId === userId || !participant.userId || !participant.user) {
          continue;
        }

        const otherUserId = participant.userId;
        const otherUser = participant.user;

        if (!settlementMap.has(otherUserId)) {
          settlementMap.set(otherUserId, {
            userId: otherUserId,
            userName: otherUser.name || 'Unknown',
            userImage: otherUser.image || undefined,
            amountOwedToMe: 0,
            amountIOwe: 0,
            netAmount: 0,
            relatedExpenses: []
          });
        }

        const settlement = settlementMap.get(otherUserId)!;

        if (userIsCreator) {
          // User paid the expense, participant owes their share to the user
          settlement.amountOwedToMe += participant.share;
          console.log(`Settlement Debug - ${otherUser.name} owes me ${participant.share} from expense ${expense.description}`);
          
          settlement.relatedExpenses.push({
            id: expense.id,
            description: expense.description,
            amount: expense.amount,
            date: expense.date.toISOString(),
            myShare: userParticipation?.share || 0,
            settledAmount: 0
          });
        } else if (expense.createdBy === otherUserId && userParticipation) {
          // Other user paid the expense, user owes their share to them
          settlement.amountIOwe += userParticipation.share;
          console.log(`Settlement Debug - I owe ${otherUser.name} ${userParticipation.share} from expense ${expense.description}`);
          
          settlement.relatedExpenses.push({
            id: expense.id,
            description: expense.description,
            amount: expense.amount,
            date: expense.date.toISOString(),
            myShare: userParticipation.share,
            settledAmount: 0
          });
        }
        // If neither user is the creator, no direct settlement between them
      }
    }

    // Now account for settlement expenses 
    // These reduce the amounts owed between users
    const settlementExpenses = await prisma.expense.findMany({
      where: {
        category: 'Settlement', // All settlement category expenses
        participants: {
          some: { userId: userId }
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          }
        }
      }
    });

    console.log('Settlement Debug - Found settlement expenses:', settlementExpenses.length);
    console.log('Settlement Debug - Settlement expenses:', settlementExpenses.map(e => ({
      id: e.id,
      description: e.description,
      amount: e.amount,
      category: e.category,
      createdBy: e.createdBy,
      participants: e.participants.map(p => ({
        userId: p.userId,
        share: p.share,
        userName: p.user?.name
      }))
    })));

    // Apply settlement expenses to reduce owed amounts
    for (const settlementExpense of settlementExpenses) {
      const settlementAmount = Math.abs(settlementExpense.amount); // Convert to positive
      
      // Settlement expenses now only have one participant (the payer)
      const settlementParticipant = settlementExpense.participants.find(p => p.userId);
      
      if (settlementParticipant && settlementParticipant.userId) {
        const payerId = settlementParticipant.userId;
        console.log(`Settlement Debug - Processing settlement: ${settlementParticipant.user?.name} paid ${settlementAmount}`);
        
        // For negative settlement amounts (settlement received), reduce what the payer owes to current user
        if (settlementExpense.amount < 0 && settlementExpense.createdBy === userId) {
          // This is a negative expense for current user, meaning they received payment
          // Find the payer in our settlement map and reduce what they owe us
          if (settlementMap.has(payerId)) {
            const settlement = settlementMap.get(payerId)!;
            const oldAmount = settlement.amountOwedToMe;
            settlement.amountOwedToMe = Math.max(0, settlement.amountOwedToMe - settlementAmount);
            console.log(`Settlement Debug - Reducing ${settlementParticipant.user?.name} owes me from ${oldAmount} to ${settlement.amountOwedToMe} (reduced by ${settlementAmount})`);
          }
        }
        
        // For positive settlement amounts (settlement paid), reduce what current user owes to the receiver
        if (settlementExpense.amount > 0 && settlementExpense.createdBy === payerId) {
          // This is a positive expense for the payer, meaning they paid someone
          // Extract receiver name from description pattern "Settlement paid to [Name]"
          const settledToMatch = settlementExpense.description.match(/Settlement paid to (.+)$/);
          if (settledToMatch) {
            const receiverName = settledToMatch[1];
            // Find the receiver in our settlement map and reduce what we owe them
            for (const settlement of settlementMap.values()) {
              if (settlement.userName === receiverName) {
                const oldAmount = settlement.amountIOwe;
                settlement.amountIOwe = Math.max(0, settlement.amountIOwe - settlementAmount);
                console.log(`Settlement Debug - Reducing I owe ${receiverName} from ${oldAmount} to ${settlement.amountIOwe} (reduced by ${settlementAmount})`);
                break;
              }
            }
          }
        }
      }
    }

    // Calculate net amounts and filter out entries where both amounts are zero
    const settlements = Array.from(settlementMap.values())
      .map(settlement => {
        settlement.netAmount = settlement.amountOwedToMe - settlement.amountIOwe;
        return settlement;
      })
      .filter(settlement => {
        // Remove entries where both amounts are effectively zero (within 1 cent tolerance)
        const owedToMeIsZero = Math.abs(settlement.amountOwedToMe) <= 1;
        const iOweIsZero = Math.abs(settlement.amountIOwe) <= 1;
        
        // Keep the settlement if either amount is non-zero
        return !(owedToMeIsZero && iOweIsZero);
      });

    console.log('Settlement Summary Debug - Final settlement map:', Array.from(settlementMap.values()));
    console.log('Settlement Summary Debug - Filtered settlements:', settlements);

    return NextResponse.json({
      success: true,
      data: settlements
    });

  } catch (error) {
    console.error('Error fetching settlement summary:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}