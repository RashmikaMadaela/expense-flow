# Business Logic & Rules Documentation

**Version:** 2.0  
**Last Updated:** September 17, 2025

## 🧮 Split Calculation Algorithms

### Equal Split Algorithm

The equal split algorithm distributes an expense amount evenly among participants, handling rounding deterministically.

```typescript
import { prisma } from '@/lib/prisma';

interface SplitResult {
  splits: { [userId: string]: number };
  totalDistributed: number;
  remainder: number;
}

function calculateEqualSplit(amount: number, participantIds: string[]): SplitResult {
  const participantCount = participantIds.length;
  
  if (participantCount === 0) {
    throw new Error('Cannot split expense with zero participants');
  }
  
  // Calculate base amount per person (rounded down)
  const baseAmount = Math.floor(amount / participantCount);
  
  // Calculate remainder to distribute
  const remainder = amount - (baseAmount * participantCount);
  
  // Create result map
  const splits: { [userId: string]: number } = {};
  
  // Assign base amount to all participants
  participantIds.forEach(id => {
    splits[id] = baseAmount;
  });
  
  // Distribute remainder to first N participants (deterministic)
  for (let i = 0; i < remainder; i++) {
    const participantId = participantIds[i];
    splits[participantId] += 1;
  }
  
  return {
    splits,
    totalDistributed: amount,
    remainder: 0
  };
}

// Example:
// amount: 101 cents, participants: ['alice', 'bob', 'charlie']
// baseAmount: 33 cents each
// remainder: 2 cents
// Result: alice: 34, bob: 34, charlie: 33
```

### Custom Amount Split Algorithm

For custom amounts, the system validates that the sum equals the total expense amount.

```typescript
function calculateCustomSplit(
  amount: number, 
  customAmounts: { [userId: string]: number }
): SplitResult {
  const participantIds = Object.keys(customAmounts);
  const totalCustom = Object.values(customAmounts).reduce((sum, amt) => sum + amt, 0);
  
  // Validate total matches
  if (totalCustom !== amount) {
    throw new ValidationError(
      `Custom amounts sum (${totalCustom}) must equal expense amount (${amount})`
    );
  }
  
  // Validate all amounts are non-negative
  for (const [userId, userAmount] of Object.entries(customAmounts)) {
    if (userAmount < 0) {
      throw new ValidationError(`Amount for user ${userId} cannot be negative`);
    }
  }
  
  return {
    splits: customAmounts,
    totalDistributed: amount,
    remainder: 0
  };
}
```

### Percentage Split Algorithm

Percentage splits handle rounding by distributing remainder cents deterministically.

```typescript
function calculatePercentageSplit(
  amount: number,
  percentages: { [userId: string]: number }
): SplitResult {
  const participantIds = Object.keys(percentages);
  const totalPercentage = Object.values(percentages).reduce((sum, pct) => sum + pct, 0);
  
  // Validate percentages sum to 100
  if (Math.abs(totalPercentage - 100) > 0.01) {
    throw new ValidationError(
      `Percentages must sum to 100%, got ${totalPercentage}%`
    );
  }
  
  // Calculate base amounts (rounded down)
  const splits: { [userId: string]: number } = {};
  let totalDistributed = 0;
  
  for (const [userId, percentage] of Object.entries(percentages)) {
    const exactAmount = (amount * percentage) / 100;
    const roundedAmount = Math.floor(exactAmount);
    splits[userId] = roundedAmount;
    totalDistributed += roundedAmount;
  }
  
  // Distribute remainder deterministically
  const remainder = amount - totalDistributed;
  
  if (remainder > 0) {
    // Sort participants by fractional part (descending) for fair distribution
    const fractionalParts = participantIds.map(userId => ({
      userId,
      fractional: ((amount * percentages[userId]) / 100) % 1
    })).sort((a, b) => b.fractional - a.fractional);
    
    // Give +1 cent to participants with highest fractional parts
    for (let i = 0; i < remainder; i++) {
      const userId = fractionalParts[i].userId;
      splits[userId] += 1;
    }
  }
  
  return {
    splits,
    totalDistributed: amount,
    remainder: 0
  };
}

// Example:
// amount: 100 cents, percentages: {alice: 33.33, bob: 33.33, charlie: 33.34}
// Base: alice: 33, bob: 33, charlie: 33 (total: 99)
// Remainder: 1 cent → goes to charlie (highest fractional: 0.34)
// Result: alice: 33, bob: 33, charlie: 34
```

---

## 💳 Debt Calculation & Management

### Debt Creation Logic

When an expense is created, debts are automatically calculated between participants and the payer.

```typescript
function createDebtsFromExpense(expense: Expense): Debt[] {
  const debts: Debt[] = [];
  const payerId = expense.paidBy;
  
  for (const participant of expense.participants) {
    // Skip the payer (they don't owe themselves)
    if (participant.userId === payerId) {
      continue;
    }
    
    // Skip participants with zero share
    if (participant.share === 0) {
      continue;
    }
    
    const debt: Debt = {
      id: generateDebtId(participant.userId, payerId, expense.id),
      debtorId: participant.userId,
      creditorId: payerId,
      amount: participant.share,
      originalAmount: participant.share,
      currency: expense.currency,
      expenseId: expense.id,
      expenseDescription: expense.description,
      category: expense.category,
      status: 'pending',
      amountPaid: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      debtorSnapshot: {
        displayName: participant.displayName,
        email: participant.email,
        photoURL: participant.photoURL
      },
      creditorSnapshot: {
        displayName: expense.paidBySnapshot.displayName,
        email: expense.paidBySnapshot.email,
        photoURL: expense.paidBySnapshot.photoURL
      }
    };
    
    debts.push(debt);
  }
  
  return debts;
}

function generateDebtId(debtorId: string, creditorId: string, expenseId: string): string {
  return `${debtorId}__${creditorId}__${expenseId}`;
}
```

### Net Balance Calculation

Users' net balances are calculated by aggregating all their outstanding debts and credits.

```typescript
interface NetBalance {
  totalOwed: number;      // Amount user owes to others
  totalOwedTo: number;    // Amount others owe to user
  netBalance: number;     // Net position (positive = net creditor)
  currency: string;
}

async function calculateUserNetBalance(userId: string): Promise<NetBalance> {
  // Get all expenses where user owes money (participant but not paid)
  const debtsOwed = await prisma.expenseParticipant.findMany({
    where: {
      userId,
      status: { in: ['PENDING'] } // Only pending debts
    },
    include: {
      expense: {
        include: {
          settlements: {
            where: { payerId: userId }
          }
        }
      }
    }
  });

  // Get all expenses where user is owed money (creator with unpaid participants)
  const debtsOwedTo = await prisma.expense.findMany({
    where: {
      createdBy: userId,
      participants: {
        some: {
          status: { in: ['PENDING'] }
        }
      }
    },
    include: {
      participants: {
        where: {
          status: { in: ['PENDING'] }
        }
      }
    }
  });

  let totalOwed = 0;
  let totalOwedTo = 0;
  
  // Sum amounts owed by user
  debtsOwed.forEach(doc => {
    const debt = doc.data() as UserDebt;
    totalOwed += debt.amount;
  });
  
  // Sum amounts owed to user
  debtsOwedTo.forEach(doc => {
    const debt = doc.data() as UserDebt;
    totalOwedTo += debt.amount;
  });
  
  return {
    totalOwed,
    totalOwedTo,
    netBalance: totalOwedTo - totalOwed,
    currency: 'USD' // User's preferred currency
  };
}
```

---

## 🤝 Settlement Processing

### Settlement Workflow

The settlement process varies based on the user's confirmation mode setting.

```typescript
enum ConfirmationMode {
  AUTO_CONFIRM = 'auto_confirm',    // Automatic confirmation
  PAYER_CONFIRM = 'payer_confirm'   // Requires payer confirmation
}

async function processSettlement(
  settlementRequest: CreateSettlementRequest,
  payerId: string
): Promise<ProcessingResult> {
  
  // Use Prisma transaction to ensure data consistency
  return await prisma.$transaction(async (tx) => {
    // 1. Validate settlement request
    const participant = await validateSettlementRequest(settlementRequest, payerId, tx);
    
    // 2. Create settlement record
    const settlement = await tx.settlement.create({
      data: {
        expenseId: settlementRequest.expenseId,
        payerId,
        amount: settlementRequest.amount,
        paymentMethod: settlementRequest.paymentMethod,
        notes: settlementRequest.notes,
        proofUrl: settlementRequest.proofUrl,
        status: 'PENDING'
      },
      include: {
        expense: {
          include: { creator: true }
        },
        payer: true
      }
    });
    
    // 3. Determine confirmation mode (based on expense creator's preferences)
    const confirmationMode = settlement.expense.creator.autoConfirmSettlements 
      ? ConfirmationMode.AUTO_CONFIRM 
      : ConfirmationMode.PAYER_CONFIRM;
    
    // 4. Process based on confirmation mode
    if (confirmationMode === ConfirmationMode.AUTO_CONFIRM) {
      return await autoConfirmSettlement(settlement, participant, tx);
    } else {
      return await createPendingSettlement(settlement, participant);
    }
  });
}

async function autoConfirmSettlement(
  settlement: Settlement, 
  participant: ExpenseParticipant,
  tx: PrismaTransaction
): Promise<ProcessingResult> {
  
  // Update settlement status
  const confirmedSettlement = await tx.settlement.update({
    where: { id: settlement.id },
    data: {
      status: 'CONFIRMED',
      confirmedAt: new Date()
    }
  });
  
  // Update participant payment status
  const remainingDebt = participant.share - settlement.amount;
  const newStatus = remainingDebt <= 0 ? 'PAID' : 'PENDING';
  
  await tx.expenseParticipant.update({
    where: { id: participant.id },
    data: { status: newStatus }
  });
  
  // Send notification to creditor (outside transaction)
  // Note: Notifications should be sent after transaction commits
  await sendNotification(debt.creditorId, {
    type: 'settlement_received',
    settlement,
    debt: updatedDebt
  });
  
  await batch.commit();
  
  return {
    settlement: { ...settlement, status: 'confirmed' },
    debt: updatedDebt,
    requiresConfirmation: false
  };
}

async function createPendingSettlement(
  settlement: Settlement,
  debt: Debt
): Promise<ProcessingResult> {
  
  // Send notification to creditor for confirmation
  await sendNotification(debt.creditorId, {
    type: 'settlement_pending_confirmation',
    settlement,
    debt
  });
  
  return {
    settlement,
    debt,
    requiresConfirmation: true
  };
}
```

### Debt Update Logic

When a settlement is confirmed, the debt record is updated accordingly.

```typescript
async function updateDebtWithPayment(
  debt: Debt, 
  paymentAmount: number,
  prisma?: PrismaClient
): Promise<Debt> {
  
  const newAmountPaid = debt.amountPaid + paymentAmount;
  const remainingAmount = debt.originalAmount - newAmountPaid;
  
  // Determine new status
  let newStatus: DebtStatus;
  if (remainingAmount <= 0) {
    newStatus = 'PAID';
  } else if (newAmountPaid > 0) {
    newStatus = 'PARTIAL';
  } else {
    newStatus = 'PENDING';
  }
  
  const updatedDebt = await prisma.debt.update({
    where: { id: debt.id },
    data: {
      amountPaid: newAmountPaid,
      amount: Math.max(0, remainingAmount),
      status: newStatus,
      lastPaymentAt: new Date(),
      updatedAt: new Date()
    }
  });
  
  return updatedDebt;
  
  if (newStatus === 'PAID') {
    await prisma.debt.update({
      where: { id: debt.id },
      data: { settledAt: new Date() }
    });
  }
  
  // Update user debt summaries if needed
  await updateUserDebtSummaries(debt, updatedDebt, prisma);
  
  return updatedDebt;
}

async function updateUserDebtIndices(
  debt: Debt,
  updates: Partial<Debt>,
  prisma?: PrismaClient
): Promise<void> {
  
  // Update debtor's debt summary
  await prisma.user.update({
    where: { id: debt.debtorId },
    data: {
      // Update summary fields would be calculated here
      // based on all debts for this user
    }
  });
  
  // Update creditor's debt summary  
  await prisma.user.update({
    where: { id: debt.creditorId },
    data: {
      // Update summary fields would be calculated here
      // based on all debts owed to this user
    }
  });
  
  const userDebtUpdates = {
    status: updates.status,
    amount: updates.amount,
    lastPaymentAt: updates.lastPaymentAt,
    settledAt: updates.settledAt
  };
  
  if (batch) {
    batch.update(debtorRef, userDebtUpdates);
    batch.update(creditorRef, userDebtUpdates);
  } else {
    await Promise.all([
      debtorRef.update(userDebtUpdates),
      creditorRef.update(userDebtUpdates)
    ]);
  }
}
```

---

## ✏️ Expense Editing Rules

### Edit Validation Logic

Expense editing is restricted based on settlement history to maintain data integrity.

```typescript
enum EditRestriction {
  NO_RESTRICTIONS = 'no_restrictions',
  METADATA_ONLY = 'metadata_only',
  NO_EDITS = 'no_edits'
}

async function validateExpenseEdit(
  expenseId: string,
  editRequest: UpdateExpenseRequest,
  userId: string
): Promise<EditValidationResult> {
  
  const expense = await getExpense(expenseId);
  
  // Check if user can edit
  if (expense.createdBy !== userId) {
    throw new Error('Only expense creator can edit');
  }
  
  // Check if expense has any settlements
  const settlements = await getExpenseSettlements(expenseId);
  const hasSettlements = settlements.length > 0;
  const hasConfirmedSettlements = settlements.some(s => s.status === 'confirmed');
  
  // Determine edit restrictions
  let restriction: EditRestriction;
  
  if (!hasSettlements) {
    restriction = EditRestriction.NO_RESTRICTIONS;
  } else if (hasConfirmedSettlements) {
    restriction = EditRestriction.NO_EDITS;
  } else {
    restriction = EditRestriction.METADATA_ONLY;
  }
  
  // Validate requested changes against restrictions
  const isFinancialEdit = hasFinancialChanges(editRequest);
  
  if (restriction === EditRestriction.NO_EDITS) {
    throw new Error('Cannot edit expense with confirmed settlements');
  }
  
  if (restriction === EditRestriction.METADATA_ONLY && isFinancialEdit) {
    throw new Error('Cannot edit amount or participants with pending settlements');
  }
  
  return {
    restriction,
    allowedFields: getAllowedEditFields(restriction),
    requiresAdjustment: false // Simplified for MVP
  };
}

function hasFinancialChanges(editRequest: UpdateExpenseRequest): boolean {
  return !!(
    editRequest.amount ||
    editRequest.participants ||
    editRequest.splitMethod
  );
}

function getAllowedEditFields(restriction: EditRestriction): string[] {
  switch (restriction) {
    case EditRestriction.NO_RESTRICTIONS:
      return ['description', 'category', 'receiptUrls', 'amount', 'participants', 'splitMethod'];
    case EditRestriction.METADATA_ONLY:
      return ['description', 'category', 'receiptUrls'];
    case EditRestriction.NO_EDITS:
      return [];
    default:
      return [];
  }
}
```

### Expense Update Processing

When an expense is updated, related debts must be recalculated.

```typescript
async function processExpenseUpdate(
  expenseId: string,
  updateRequest: UpdateExpenseRequest,
  userId: string
): Promise<UpdateResult> {
  
  // Validate edit permissions
  const validation = await validateExpenseEdit(expenseId, updateRequest, userId);
  
  const result = await prisma.$transaction(async (tx) => {
    const expense = await tx.expense.findUnique({
      where: { id: expenseId },
      include: { participants: true }
    });
    
    if (!expense) {
      throw new Error('Expense not found');
    }
    
    // Update expense document
    const updatedExpense = await updateExpenseDocument(
      tx, 
      expense, 
      updateRequest
    );
    
    // If financial changes, recalculate debts
    if (hasFinancialChanges(updateRequest)) {
      await recalculateExpenseDebts(tx, updatedExpense, expense);
    }
    
    return updatedExpense;
  });
  
  return result;
}

async function recalculateExpenseDebts(
  transaction: PrismaTransaction,
  newExpense: Expense,
  oldExpense: Expense
): Promise<void> {
  
  // Get existing debts for this expense
  const existingDebts = await transaction.debt.findMany({
    where: { expenseId: oldExpense.id }
  });
  
  // Calculate new debt distribution
  const newDebts = createDebtsFromExpense(newExpense);
  
  // For each existing debt, either update or delete
  for (const oldDebt of existingDebts) {
    const matchingNewDebt = newDebts.find(d => 
      d.debtorId === oldDebt.debtorId && d.creditorId === oldDebt.creditorId
    );
    
    if (matchingNewDebt) {
      // Update existing debt with new amount
      await transaction.debt.update({
        where: { id: oldDebt.id },
        data: {
          amount: matchingNewDebt.amount,
          originalAmount: matchingNewDebt.amount,
          updatedAt: new Date()
        }
      });
    } else {
      // Delete debt that no longer exists
      await transaction.debt.delete({
        where: { id: oldDebt.id }
      });
    }
  }
  
  // Create any new debts that didn't exist before
  for (const newDebt of newDebts) {
    const existingDebt = existingDebts.find(d =>
      d.debtorId === newDebt.debtorId && d.creditorId === newDebt.creditorId
    );
    
    if (!existingDebt) {
      await transaction.debt.create({
        data: newDebt
      });
    }
  }
}
```

---

## 🔄 Data Consistency Rules

### Transaction Boundaries

All operations that affect multiple related records must use Prisma transactions to ensure ACID consistency.

```typescript
// Critical operations that require transactions:

1. **Expense Creation**
   - Create expense record
   - Create all participant records
   - Update user balances (if maintaining cached balances)

2. **Settlement Processing**
   - Create settlement record
   - Update participant payment status
   - Update expense settlement status

3. **Expense Editing**
   - Update expense details
   - Recalculate participant shares
   - Update existing participant records

4. **User Deletion**
   - Soft delete user record
   - Handle orphaned expenses
   - Transfer or remove user participations

// Example transaction for expense creation
async function createExpenseWithParticipants(data: CreateExpenseRequest, userId: string) {
  return await prisma.$transaction(async (tx) => {
    // Create expense
    const expense = await tx.expense.create({
      data: {
        description: data.description,
        amount: data.amount,
        currency: data.currency || 'USD',
        category: data.category,
        createdBy: userId,
        groupId: data.groupId,
        receiptUrl: data.receiptUrl,
        notes: data.notes
      }
    });

    // Create participants
    await tx.expenseParticipant.createMany({
      data: data.participants.map(p => ({
        expenseId: expense.id,
        userId: p.userId,
        share: p.share
      }))
    });

    // Return complete expense with participants
    return await tx.expense.findUnique({
      where: { id: expense.id },
      include: {
        participants: { include: { user: true } },
        creator: true
      }
    });
  });
}
```

### Prisma Transaction Features

PostgreSQL with Prisma provides superior transaction guarantees compared to Firestore:

- **ACID Compliance**: Full atomicity, consistency, isolation, and durability
- **Rollback Support**: Automatic rollback on any operation failure
- **Read Consistency**: Consistent reads within transaction scope
- **Deadlock Detection**: Automatic deadlock detection and resolution

2. **Settlement Processing**  
   - Update settlement status
   - Update debt amount/status
   - Update user debt indices
   - Send notifications

3. **Expense Updates**
## 🗂️ User Account Deletion

### Soft Delete Strategy

When users delete their accounts, we use soft deletion to preserve expense history and data integrity.

```typescript
async function deleteUserAccount(userId: string): Promise<DeletionResult> {
  return await prisma.$transaction(async (tx) => {
    // 1. Soft delete the user
    const deletedUser = await tx.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        email: `deleted_${userId}@removed.user`, // Anonymize email
        name: 'Deleted User',
        image: null
      }
    });

    // 2. Handle user's outstanding debts
    const outstandingParticipations = await tx.expenseParticipant.findMany({
      where: {
        userId,
        status: 'PENDING'
      },
      include: { expense: true }
    });

    // Mark user as exempt from pending debts
    await tx.expenseParticipant.updateMany({
      where: {
        userId,
        status: 'PENDING'
      },
      data: {
        status: 'EXEMPT'
      }
    });

    // 3. Handle expenses created by the user
    const userExpenses = await tx.expense.findMany({
      where: { createdBy: userId },
      include: {
        participants: {
          where: { status: 'PENDING' }
        }
      }
    });

    // For expenses with outstanding debts, transfer ownership to most active participant
    for (const expense of userExpenses) {
      if (expense.participants.length > 0) {
        // Find most active participant (or first one)
        const newCreator = expense.participants[0];
        
        await tx.expense.update({
          where: { id: expense.id },
          data: {
            createdBy: newCreator.userId,
            notes: `${expense.notes || ''}\n[Original creator account deleted]`
          }
        });
      }
    }

    // 4. Preserve settlement history (settlements remain unchanged)
    // Settlements already contain payer snapshots, so they're preserved

    // 5. Remove from groups
    await tx.groupMember.deleteMany({
      where: { userId }
    });

    // 6. Remove friend connections
    await tx.friendRequest.deleteMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId }
        ]
      }
    });

    return {
      deletedUser,
      expensesTransferred: userExpenses.length,
      debtsExempted: outstandingParticipations.length
    };
  });
}
```

### GDPR Compliance

For complete data removal (GDPR "right to be forgotten"):

```typescript
async function hardDeleteUserData(userId: string): Promise<void> {
  // WARNING: This permanently removes all user data
  // Only use for legal compliance requirements
  
  return await prisma.$transaction(async (tx) => {
    // Delete in proper order due to foreign key constraints
    await tx.settlement.deleteMany({ where: { payerId: userId } });
    await tx.expenseParticipant.deleteMany({ where: { userId } });
    await tx.expense.deleteMany({ where: { createdBy: userId } });
    await tx.groupMember.deleteMany({ where: { userId } });
    await tx.friendRequest.deleteMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }]
      }
    });
    await tx.session.deleteMany({ where: { userId } });
    await tx.account.deleteMany({ where: { userId } });
    await tx.user.delete({ where: { id: userId } });
  });
}
```
```

## ✅ Data Validation Rules

### Input Validation with Zod

All API inputs are validated using Zod schemas for type safety and data integrity.

```typescript
import { z } from 'zod';

// Expense validation schema
export const createExpenseSchema = z.object({
  amount: z.number().positive().max(1000000), // Max $1M
  description: z.string().min(1).max(100),
  groupId: z.string().uuid().optional(),
  category: z.enum(['FOOD', 'TRANSPORT', 'ACCOMMODATION', 'ENTERTAINMENT', 'SHOPPING', 'OTHER']),
  splitType: z.enum(['EQUAL', 'CUSTOM']),
  participants: z.array(z.object({
    userId: z.string().uuid(),
    shareAmount: z.number().positive().optional()
  })).min(2).max(50), // 2-50 people max
  currency: z.string().length(3).default('USD'),
  date: z.string().datetime().optional()
});

// Settlement validation
export const createSettlementSchema = z.object({
  amount: z.number().positive().max(100000), // Max $100K per settlement
  fromUserId: z.string().uuid(),
  toUserId: z.string().uuid(),
  description: z.string().max(200).optional(),
  method: z.enum(['CASH', 'VENMO', 'PAYPAL', 'BANK_TRANSFER', 'OTHER']).optional()
}).refine(data => data.fromUserId !== data.toUserId, {
  message: "Cannot settle debt with yourself"
});

// Amount validation
function validateAmount(amount: number): void {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }
  if (amount > 1000000) { // $1M limit
    throw new Error('Amount cannot exceed $1,000,000');
  }
  // Prisma handles decimal precision automatically
}

// Participant validation
function validateParticipants(participants: { userId: string; shareAmount?: number }[]): void {
  if (participants.length < 2) {
    throw new Error('Expense must have at least 2 participants');
  }
  if (participants.length > 50) {
    throw new Error('Cannot have more than 50 participants');
  }
  
  // Check for duplicate participants
  const userIds = participants.map(p => p.userId);
  const uniqueUserIds = new Set(userIds);
  if (userIds.length !== uniqueUserIds.size) {
    throw new Error('Duplicate participants not allowed');
  }
}

// Currency validation
function validateCurrency(currency: string): void {
  const supportedCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];
  if (!supportedCurrencies.includes(currency)) {
    throw new Error(`Unsupported currency: ${currency}`);
  }
}
```

---

## 🚨 Edge Case Handling

### Concurrent Settlement Handling

Handle race conditions when multiple participants try to settle the same debt using Prisma transactions.

```typescript
async function handleConcurrentSettlement(
  settlementRequest: CreateSettlementRequest
): Promise<Settlement> {
  
  return await prisma.$transaction(async (tx) => {
    // Get current net balance between users
    const balance = await calculateNetBalance(
      settlementRequest.fromUserId,
      settlementRequest.toUserId,
      tx
    );
    
    if (balance <= 0) {
      throw new Error('No debt exists between these users');
    }
    
    // Check if settlement amount exceeds remaining debt
    if (settlementRequest.amount > balance) {
      throw new Error(
        `Settlement amount ($${settlementRequest.amount}) exceeds remaining debt ($${balance})`
      );
    }
    
    // Create settlement record atomically
    const settlement = await tx.settlement.create({
      data: {
        amount: settlementRequest.amount,
        payerId: settlementRequest.fromUserId,
        payeeId: settlementRequest.toUserId,
        description: settlementRequest.description,
        method: settlementRequest.method || 'CASH',
        status: 'COMPLETED',
        settledAt: new Date()
      },
      include: {
        payer: { select: { name: true, email: true } },
        payee: { select: { name: true, email: true } }
      }
    });
    
    return settlement;
  });
}
```

### Group Deletion Scenarios

When a group is deleted, handle orphaned expenses gracefully.

```typescript
async function handleGroupDeletion(groupId: string, adminUserId: string): Promise<DeletionResult> {
  return await prisma.$transaction(async (tx) => {
    // Verify admin permissions
    const adminMember = await tx.groupMember.findFirst({
      where: {
        groupId,
        userId: adminUserId,
        role: 'ADMIN'
      }
    });
    
    if (!adminMember) {
      throw new Error('Only group admins can delete groups');
    }
    
    // Check for unsettled expenses
    const groupExpenses = await tx.expense.findMany({
      where: { groupId },
      include: {
        participants: {
          where: { status: 'PENDING' }
        }
      }
    });
    
    const hasUnsettledExpenses = groupExpenses.some(e => e.participants.length > 0);
    
    if (hasUnsettledExpenses) {
      throw new Error(
        'Cannot delete group with unsettled expenses. Please settle all debts first.'
      );
    }
    
    // Soft delete the group
    const deletedGroup = await tx.group.update({
      where: { id: groupId },
      data: {
        deletedAt: new Date(),
        name: `[DELETED] ${Date.now()}`
      }
    });
    
    // Remove all members
    await tx.groupMember.deleteMany({
      where: { groupId }
    });
    
    // Convert group expenses to individual expenses
    await tx.expense.updateMany({
      where: { groupId },
      data: {
        groupId: null,
        notes: { push: '[Original group deleted]' }
      }
    });
    
    return {
      deleted: true,
      expensesConverted: groupExpenses.length
    };
  });
}
```

### Database Constraint Violations

Handle common Prisma constraint violations gracefully.

```typescript
export async function handleDatabaseError(error: unknown): Promise<never> {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        // Unique constraint violation
        const target = error.meta?.target as string[];
        if (target?.includes('email')) {
          throw new Error('Email address already registered');
        }
        throw new Error('Duplicate entry detected');
        
      case 'P2003':
        // Foreign key constraint violation
        throw new Error('Referenced record does not exist');
        
      case 'P2025':
        // Record not found
        throw new Error('Record not found');
        
      case 'P2014':
        // Required relation missing
        throw new Error('Required relationship missing');
        
      default:
        console.error('Database error:', error);
        throw new Error('Database operation failed');
    }
  }
  
  throw error;
}
```

---

**Next:** [Security Documentation](../security/overview.md)