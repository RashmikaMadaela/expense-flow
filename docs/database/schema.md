# Database Schema

**Version:** 2.0  
**Last Updated:** September 17, 2025  
**Database:** PostgreSQL with Prisma ORM

This document defines the complete database schema for the Expense Flow application using PostgreSQL and Prisma ORM.

## 🎯 Overview

The database uses a relational structure with PostgreSQL, providing strong consistency, complex queries, and ACID transactions. Prisma ORM provides type-safe database access and automatic migration management.

### Key Design Principles
- **Relational Integrity**: Foreign key constraints ensure data consistency
- **Type Safety**: Prisma generates TypeScript types from the schema
- **Audit Trail**: Track all changes with timestamps and user references
- **Soft Deletes**: Preserve data integrity when users leave groups
- **Performance**: Optimized indexes for common query patterns

## 📋 Prisma Schema

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Users and Authentication
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  image     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Expense relationships
  createdExpenses Expense[] @relation("ExpenseCreator")
  participations  ExpenseParticipant[]
  settlements     Settlement[]
  
  // Friendship relationships
  sentFriendRequests     FriendRequest[] @relation("FriendRequestSender")
  receivedFriendRequests FriendRequest[] @relation("FriendRequestReceiver")
  
  // Group relationships
  groupMemberships GroupMember[]
  
  // Authentication (NextAuth.js required)
  accounts Account[]
  sessions Session[]
  
  @@map("users")
}

// Expenses
model Expense {
  id          String   @id @default(cuid())
  description String
  amount      Int      // Amount in cents to avoid floating point issues
  currency    String   @default("USD")
  category    String
  date        DateTime @default(now())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime? // Soft delete
  
  // Relationships
  createdBy     String
  creator       User   @relation("ExpenseCreator", fields: [createdBy], references: [id])
  participants  ExpenseParticipant[]
  settlements   Settlement[]
  
  // Optional group assignment
  groupId String?
  group   Group?  @relation(fields: [groupId], references: [id])
  
  // Metadata
  receiptUrl String? // URL to uploaded receipt image
  notes      String?
  
  @@index([createdBy])
  @@index([groupId])
  @@index([createdAt])
  @@map("expenses")
}

// Expense Participants (who owes what)
model ExpenseParticipant {
  id       String @id @default(cuid())
  share    Int    // Amount this participant owes in cents
  status   ParticipantStatus @default(PENDING)
  
  // Relationships
  expenseId String
  expense   Expense @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  userId    String
  user      User    @relation(fields: [userId], references: [id])
  
  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([expenseId, userId]) // One participant record per user per expense
  @@index([userId])
  @@map("expense_participants")
}

// Settlement Records
model Settlement {
  id            String   @id @default(cuid())
  amount        Int      // Amount settled in cents
  paymentMethod String
  notes         String?
  status        SettlementStatus @default(PENDING)
  
  // Timestamps
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  confirmedAt DateTime?
  
  // Relationships
  expenseId String
  expense   Expense @relation(fields: [expenseId], references: [id])
  payerId   String
  payer     User    @relation(fields: [payerId], references: [id])
  
  // Payment proof
  proofUrl String? // URL to payment proof image
  
  @@index([expenseId])
  @@index([payerId])
  @@index([status])
  @@map("settlements")
}

// Groups for organizing expenses
model Group {
  id          String   @id @default(cuid())
  name        String
  description String?
  currency    String   @default("USD")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relationships
  members  GroupMember[]
  expenses Expense[]
  
  @@map("groups")
}

// Group membership
model GroupMember {
  id       String @id @default(cuid())
  role     GroupRole @default(MEMBER)
  joinedAt DateTime  @default(now())
  
  // Relationships
  groupId String
  group   Group  @relation(fields: [groupId], references: [id], onDelete: Cascade)
  userId  String
  user    User   @relation(fields: [userId], references: [id])
  
  @@unique([groupId, userId])
  @@map("group_members")
}

// Friend requests and relationships
model FriendRequest {
  id        String @id @default(cuid())
  status    FriendRequestStatus @default(PENDING)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relationships
  senderId   String
  sender     User @relation("FriendRequestSender", fields: [senderId], references: [id])
  receiverId String
  receiver   User @relation("FriendRequestReceiver", fields: [receiverId], references: [id])
  
  @@unique([senderId, receiverId])
  @@map("friend_requests")
}

// Enums
enum ParticipantStatus {
  PENDING
  PAID
  EXEMPT
}

enum SettlementStatus {
  PENDING
  CONFIRMED
  REJECTED
}

enum GroupRole {
  ADMIN
  MEMBER
}

enum FriendRequestStatus {
  PENDING
  ACCEPTED
  REJECTED
}

// NextAuth.js required models
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("sessions")
}
```

## 🔧 TypeScript Types (Generated by Prisma)

Prisma automatically generates TypeScript types from the schema. Here are the main types you'll work with:

```typescript
// Generated types from Prisma
import { User, Expense, ExpenseParticipant, Settlement, Group } from '@prisma/client';

// Common combined types for API responses
type ExpenseWithParticipants = Expense & {
  participants: (ExpenseParticipant & { user: User })[];
  creator: User;
  settlements?: Settlement[];
};

type UserWithFriends = User & {
  sentFriendRequests: FriendRequest[];
  receivedFriendRequests: FriendRequest[];
};

type GroupWithMembers = Group & {
  members: (GroupMember & { user: User })[];
  expenses?: Expense[];
};

// API request/response types
interface CreateExpenseRequest {
  description: string;
  amount: number; // in cents
  currency?: string;
  category: string;
  participants: {
    userId: string;
    share: number; // in cents
  }[];
  groupId?: string;
  receiptUrl?: string;
  notes?: string;
}

interface UpdateExpenseRequest {
  description?: string;
  category?: string;
  notes?: string;
  receiptUrl?: string;
}

interface CreateSettlementRequest {
  expenseId: string;
  amount: number; // in cents
  paymentMethod: string;
  notes?: string;
  proofUrl?: string;
}
```

## 🗃️ Database Queries

### Common Query Patterns

```typescript
import { prisma } from '@/lib/prisma';

// Get user's expenses with participants
async function getUserExpenses(userId: string) {
  return await prisma.expense.findMany({
    where: {
      OR: [
        { createdBy: userId },
        { participants: { some: { userId } } }
      ]
    },
    include: {
      participants: {
        include: { user: true }
      },
      creator: true,
      settlements: true
    },
    orderBy: { createdAt: 'desc' }
  });
}

// Get user's debt summary
async function getUserDebts(userId: string) {
  return await prisma.expenseParticipant.findMany({
    where: {
      userId,
      status: { not: 'PAID' }
    },
    include: {
      expense: {
        include: {
          creator: true,
          settlements: {
            where: { payerId: userId }
          }
        }
      }
    }
  });
}

// Create expense with participants (transaction)
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

    return expense;
  });
}

// Get expense with all related data
async function getExpenseDetails(expenseId: string) {
  return await prisma.expense.findUnique({
    where: { id: expenseId },
    include: {
      participants: {
        include: { user: true }
      },
      creator: true,
      settlements: {
        include: { payer: true }
      },
      group: true
    }
  });
}
```

## 🔍 Database Indexes

PostgreSQL indexes are automatically created by Prisma based on the schema:

```sql
-- Automatically created indexes
CREATE INDEX "expenses_createdBy_idx" ON "expenses"("createdBy");
CREATE INDEX "expenses_groupId_idx" ON "expenses"("groupId");
CREATE INDEX "expenses_createdAt_idx" ON "expenses"("createdAt");
CREATE INDEX "expense_participants_userId_idx" ON "expense_participants"("userId");
CREATE INDEX "settlements_expenseId_idx" ON "settlements"("expenseId");
CREATE INDEX "settlements_payerId_idx" ON "settlements"("payerId");
CREATE INDEX "settlements_status_idx" ON "settlements"("status");

-- Unique constraints
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "expense_participants_expenseId_userId_key" ON "expense_participants"("expenseId", "userId");
CREATE UNIQUE INDEX "group_members_groupId_userId_key" ON "group_members"("groupId", "userId");
CREATE UNIQUE INDEX "friend_requests_senderId_receiverId_key" ON "friend_requests"("senderId", "receiverId");
```

## 🔄 Database Migrations

Prisma handles database migrations automatically:

```bash
# Create a new migration
npx prisma migrate dev --name add_groups_feature

# Apply migrations to production
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset

# Generate Prisma client after schema changes
npx prisma generate
```

## 📊 Sample Data

```typescript
// Sample data for development/testing
const sampleUsers = [
  {
    email: 'alice@example.com',
    name: 'Alice Johnson',
    image: 'https://example.com/alice.jpg'
  },
  {
    email: 'bob@example.com',
    name: 'Bob Smith',
    image: 'https://example.com/bob.jpg'
  }
];

const sampleExpense = {
  description: 'Grocery shopping',
  amount: 12599, // $125.99 in cents
  currency: 'USD',
  category: 'groceries',
  createdBy: 'alice_user_id',
  participants: [
    { userId: 'alice_user_id', share: 6299 }, // $62.99
    { userId: 'bob_user_id', share: 6300 }    // $63.00
  ]
};
```

## 🔐 Database Security

### Row Level Security (RLS)

PostgreSQL Row Level Security can be enabled for additional protection:

```sql
-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_participants ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY user_policy ON users FOR ALL USING (id = current_setting('app.current_user_id'));

-- Users can access expenses they created or participate in
CREATE POLICY expense_policy ON expenses FOR ALL USING (
  created_by = current_setting('app.current_user_id') OR
  id IN (SELECT expense_id FROM expense_participants WHERE user_id = current_setting('app.current_user_id'))
);
```

### API Level Security

Security is primarily handled at the API level in Next.js:

```typescript
// middleware.ts - Protect API routes
import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/auth/signin',
  },
});

export const config = {
  matcher: ['/api/:path*', '/dashboard/:path*']
};

// API route security
async function getUserExpenses(userId: string, session: Session) {
  // Ensure user can only access their own data
  if (session.user.id !== userId) {
    throw new Error('Unauthorized');
  }
  
  return await prisma.expense.findMany({
    where: {
      OR: [
        { createdBy: userId },
        { participants: { some: { userId } } }
      ]
    }
  });
}
```

## 🎯 Performance Considerations

### Query Optimization
- Use `include` and `select` to fetch only needed data
- Implement pagination for large result sets
- Use database-level aggregations when possible

### Caching Strategy
- Cache user sessions with NextAuth.js
- Consider Redis for frequently accessed data
- Use React Query for client-side caching

### Database Connection
- Use connection pooling (Prisma handles this automatically)
- Monitor connection usage in production
- Consider read replicas for scaling

---

**Next:** [API Endpoints Documentation](../api/endpoints.md)