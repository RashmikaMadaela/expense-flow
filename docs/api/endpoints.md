# API Endpoints Documentation

**Version:** 2.0  
**Last Updated:** September 17, 2025  
**Base URL:** `http://localhost:3000/api` (development) | `https://your-domain.vercel.app/api` (production)

## 🌐 API Overview

The Expense Flow API is built using Next.js API routes and provides RESTful endpoints for all application functionality. All endpoints require NextAuth.js session authentication and follow consistent request/response patterns.

### Authentication

All API requests must include a valid NextAuth.js session. Authentication is handled automatically by the Next.js middleware for protected routes.

For external API access, include the session token:

```http
Cookie: next-auth.session-token=<session-token>
```

### Response Format

All API responses follow a consistent structure:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}
```

### Error Codes

```typescript
// Standard HTTP status codes with custom error codes
enum ErrorCode {
  // Authentication (401)
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  AUTH_INVALID = 'AUTH_INVALID',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  
  // Authorization (403)
  ACCESS_DENIED = 'ACCESS_DENIED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // Validation (400)
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  AMOUNT_TOO_LARGE = 'AMOUNT_TOO_LARGE',
  TOO_MANY_PARTICIPANTS = 'TOO_MANY_PARTICIPANTS',
  
  // Business Logic (422)
  CANNOT_EDIT_SETTLED_EXPENSE = 'CANNOT_EDIT_SETTLED_EXPENSE',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  USER_NOT_PARTICIPANT = 'USER_NOT_PARTICIPANT',
  SETTLEMENT_ALREADY_EXISTS = 'SETTLEMENT_ALREADY_EXISTS',
  
  // Not Found (404)
  EXPENSE_NOT_FOUND = 'EXPENSE_NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  DEBT_NOT_FOUND = 'DEBT_NOT_FOUND',
  
  // Server Error (500)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR'
}
```

---

## 👤 User Management

### Get User Profile

```http
GET /api/user/profile
```

**Headers:**
```http
Content-Type: application/json
```

**Response:**
```typescript
interface UserProfileResponse {
  user: {
    id: string;
    email: string;
    name: string;
    image?: string;
    createdAt: string;
    updatedAt: string;
  };
}
```

**Example Implementation:**
```typescript
// app/api/user/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { user },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
```

### Update User Profile

```http
PUT /api/user/profile
```

**Request Body:**
```typescript
interface UpdateProfileRequest {
  name?: string;
  image?: string;
}
```

**Response:**
```typescript
interface UpdateProfileResponse {
  user: UserProfile;
  updated: string[];  // List of fields that were updated
}
```

**Example Implementation:**
```typescript
// app/api/user/profile/route.ts
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, image } = body;

    // Validate input
    if (name && (typeof name !== 'string' || name.trim().length === 0)) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Name must be a non-empty string' } },
        { status: 400 }
      );
    }

    const updateData: any = {};
    const updated: string[] = [];

    if (name !== undefined) {
      updateData.name = name.trim();
      updated.push('name');
    }
    if (image !== undefined) {
      updateData.image = image;
      updated.push('image');
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json({
      success: true,
      data: { user, updated },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
```

### Delete User Account

```http
DELETE /api/user/account
```

**Query Parameters:**
- `confirm` (required): Must be "DELETE_MY_ACCOUNT"

**Response:**
```typescript
interface DeleteAccountResponse {
  deleted: boolean;
  exportedData?: UserDataExport;
  pendingDebts?: Debt[];  // Unsettled debts preventing deletion
}
```

### Export User Data

```http
GET /user/export
```

**Response:**
```typescript
interface UserDataExport {
  profile: UserProfile;
  expenses: Expense[];
  debts: Debt[];
  settlements: Settlement[];
  friends: UserConnection[];
  exportedAt: string;
}
```

---

## 🔍 User Search & Friends

### Search Users

```http
GET /users/search
```

**Query Parameters:**
- `q` (required): Search query (email or display name)
- `limit` (optional): Max results (default: 10, max: 20)

**Response:**
```typescript
interface SearchUsersResponse {
  users: {
    uid: string;
    displayName: string;
    email: string;
    photoURL?: string;
  }[];
  hasMore: boolean;
}
```

### Send Friend Request

```http
POST /friends/invite
```

**Request Body:**
```typescript
interface FriendInviteRequest {
  friendId: string;
  message?: string;
}
```

**Response:**
```typescript
interface FriendInviteResponse {
  invitation: {
    id: string;
    friendId: string;
    status: 'pending';
    createdAt: string;
  };
}
```

### Respond to Friend Request

```http
PUT /friends/respond
```

**Request Body:**
```typescript
interface FriendResponseRequest {
  friendId: string;
  action: 'accept' | 'decline' | 'block';
}
```

### List Friends

```http
GET /friends
```

**Query Parameters:**
- `status` (optional): 'pending' | 'accepted' | 'blocked'
- `limit` (optional): Max results (default: 50)

**Response:**
```typescript
interface FriendsListResponse {
  friends: UserConnection[];
  hasMore: boolean;
}
```

---

## 💰 Expense Management

### Create Expense

```http
POST /api/expenses
```

**Request Body:**
```typescript
interface CreateExpenseRequest {
  description: string;
  amount: number;                    // Amount in cents
  currency?: string;                 // ISO currency code (defaults to USD)
  category: string;
  participants: {
    userId: string;                  // User ID from database
    share: number;                   // Amount this participant owes in cents
  }[];
  groupId?: string;                  // Optional group assignment
  receiptUrl?: string;               // URL to uploaded receipt
  notes?: string;
}
```

**Response:**
```typescript
interface CreateExpenseResponse {
  expense: ExpenseWithParticipants;
}

type ExpenseWithParticipants = Expense & {
  participants: (ExpenseParticipant & { user: User })[];
  creator: User;
};
```

**Example Implementation:**
```typescript
// app/api/expenses/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createExpenseSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.number().int().positive('Amount must be positive'),
  currency: z.string().length(3).optional().default('USD'),
  category: z.string().min(1, 'Category is required'),
  participants: z.array(z.object({
    userId: z.string(),
    share: z.number().int().positive()
  })).min(1, 'At least one participant required'),
  groupId: z.string().optional(),
  receiptUrl: z.string().url().optional(),
  notes: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = createExpenseSchema.parse(body);

    // Verify total shares equal expense amount
    const totalShares = validatedData.participants.reduce((sum, p) => sum + p.share, 0);
    if (totalShares !== validatedData.amount) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Participant shares must equal total amount' } },
        { status: 400 }
      );
    }

    // Create expense with participants in a transaction
    const expense = await prisma.$transaction(async (tx) => {
      // Create expense
      const newExpense = await tx.expense.create({
        data: {
          description: validatedData.description,
          amount: validatedData.amount,
          currency: validatedData.currency,
          category: validatedData.category,
          createdBy: session.user.id,
          groupId: validatedData.groupId,
          receiptUrl: validatedData.receiptUrl,
          notes: validatedData.notes
        }
      });

      // Create participants
      await tx.expenseParticipant.createMany({
        data: validatedData.participants.map(p => ({
          expenseId: newExpense.id,
          userId: p.userId,
          share: p.share
        }))
      });

      // Return expense with participants
      return await tx.expense.findUnique({
        where: { id: newExpense.id },
        include: {
          participants: {
            include: { user: true }
          },
          creator: true
        }
      });
    });

    return NextResponse.json({
      success: true,
      data: { expense },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: error.errors[0].message } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const offset = (page - 1) * limit;

    const expenses = await prisma.expense.findMany({
      where: {
        OR: [
          { createdBy: session.user.id },
          { participants: { some: { userId: session.user.id } } }
        ]
      },
      include: {
        participants: {
          include: { user: true }
        },
        creator: true,
        settlements: true
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit
    });

    return NextResponse.json({
      success: true,
      data: { expenses, page, limit },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
```

### Get Expense Details

```http
GET /api/expenses/[id]
```

**Response:**
```typescript
interface ExpenseDetailsResponse {
  expense: ExpenseWithParticipants;
  settlements: (Settlement & { payer: User })[];
  canEdit: boolean;
  canDelete: boolean;
}
```

### Update Expense

```http
PUT /expenses/{expenseId}
```

**Request Body:**
```typescript
interface UpdateExpenseRequest {
  description?: string;
  category?: ExpenseCategory;
  receiptUrls?: string[];
  
  // Financial changes (require special handling)
  amount?: number;
  participants?: ExpenseParticipant[];
  splitMethod?: 'equal' | 'custom' | 'percentage';
}
```

**Response:**
```typescript
interface UpdateExpenseResponse {
  expense: Expense;
  adjustmentCreated?: Expense;      // If financial changes were made
  debtsAffected: Debt[];
}
```

### List User Expenses

```http
GET /expenses
```

**Query Parameters:**
- `status` (optional): 'draft' | 'active' | 'settled' | 'cancelled'
- `category` (optional): Filter by expense category
- `limit` (optional): Max results (default: 20, max: 100)
- `cursor` (optional): Pagination cursor
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string

**Response:**
```typescript
interface ExpensesListResponse {
  expenses: Expense[];
  nextCursor?: string;
  hasMore: boolean;
  total: number;
}
```

### Delete Expense

```http
DELETE /expenses/{expenseId}
```

**Response:**
```typescript
interface DeleteExpenseResponse {
  deleted: boolean;
  debtsRemoved: string[];           // Debt IDs that were removed
}
```

---

## 💳 Debt & Settlement Management

### Get User Debts Summary

```http
GET /debts/summary
```

**Response:**
```typescript
interface DebtsSummaryResponse {
  totalOwed: number;                // Total amount user owes (cents)
  totalOwedTo: number;              // Total amount owed to user (cents)
  netBalance: number;               // Net position (cents)
  currency: string;                 // User's preferred currency
  
  breakdown: {
    byPerson: {
      userId: string;
      displayName: string;
      photoURL?: string;
      netAmount: number;            // Positive = they owe you, negative = you owe them
      currency: string;
    }[];
    byCategory: {
      category: ExpenseCategory;
      totalOwed: number;
      totalOwedTo: number;
    }[];
  };
}
```

### List User Debts

```http
GET /debts
```

**Query Parameters:**
- `direction` (optional): 'owes' | 'owed' | 'all'
- `status` (optional): 'pending' | 'partial' | 'paid'
- `userId` (optional): Filter by specific user
- `limit` (optional): Max results (default: 50)

**Response:**
```typescript
interface DebtsListResponse {
  debts: Debt[];
  hasMore: boolean;
}
```

### Create Settlement

```http
POST /settlements
```

**Request Body:**
```typescript
interface CreateSettlementRequest {
  debtId: string;
  amount: number;                   // Amount being paid (cents)
  paymentMethod: PaymentMethod;
  paymentReference?: string;        // External payment ID
  notes?: string;
  proofUrls?: string[];            // Photo proof of payment
}
```

**Response:**
```typescript
interface CreateSettlementResponse {
  settlement: Settlement;
  debtUpdated: Debt;
  requiresConfirmation: boolean;    // True if payer-confirm mode is enabled
}
```

### Confirm Settlement

```http
PUT /settlements/{settlementId}/confirm
```

**Request Body:**
```typescript
interface ConfirmSettlementRequest {
  action: 'confirm' | 'dispute';
  notes?: string;
  disputeReason?: string;           // Required if action is 'dispute'
}
```

**Response:**
```typescript
interface ConfirmSettlementResponse {
  settlement: Settlement;
  debtUpdated: Debt;
}
```

### List Settlements

```http
GET /settlements
```

**Query Parameters:**
- `status` (optional): 'pending' | 'confirmed' | 'disputed'
- `debtId` (optional): Filter by specific debt
- `limit` (optional): Max results (default: 20)

---

## 📊 Dashboard & Analytics

### Get Dashboard Summary

```http
GET /dashboard/summary
```

**Response:**
```typescript
interface DashboardSummaryResponse {
  overview: {
    totalExpenses: number;          // Total expenses created
    totalAmount: number;            // Total amount in preferred currency
    activeDebts: number;            // Number of unsettled debts
    pendingSettlements: number;     // Settlements awaiting confirmation
  };
  
  financialSummary: {
    totalOwed: number;              // Amount user owes others
    totalOwedTo: number;            // Amount others owe user  
    netBalance: number;             // Net position
    currency: string;
  };
  
  recentActivity: {
    expenses: Expense[];            // Last 5 expenses
    settlements: Settlement[];      // Last 5 settlements
  };
  
  topCategories: {
    category: ExpenseCategory;
    amount: number;
    count: number;
  }[];
  
  frequentContacts: {
    userId: string;
    displayName: string;
    photoURL?: string;
    expenseCount: number;
    totalShared: number;
  }[];
}
```

### Get Spending Analytics

```http
GET /analytics/spending
```

**Query Parameters:**
- `period` (required): 'week' | 'month' | 'quarter' | 'year'
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string
- `groupBy` (optional): 'category' | 'person' | 'day' | 'week' | 'month'

**Response:**
```typescript
interface SpendingAnalyticsResponse {
  period: {
    start: string;
    end: string;
    totalExpenses: number;
    totalAmount: number;
  };
  
  breakdown: {
    label: string;                  // Category, person name, or date
    amount: number;
    count: number;
    percentage: number;
  }[];
  
  trends: {
    date: string;
    amount: number;
    count: number;
  }[];
}
```

---

## 📁 File Upload

### Upload Receipt

```http
POST /upload/receipt
```

**Request:** Multipart form data
- `file`: Image file (JPG, PNG, PDF)
- `expenseId` (optional): Associate with existing expense

**Response:**
```typescript
interface UploadReceiptResponse {
  url: string;                      // Cloud Storage URL
  filename: string;
  size: number;                     // File size in bytes
  contentType: string;
}
```

### Upload Profile Photo

```http
POST /upload/profile-photo
```

**Request:** Multipart form data
- `file`: Image file (JPG, PNG)

**Response:**
```typescript
interface UploadPhotoResponse {
  url: string;                      // Cloud Storage URL
  filename: string;
  size: number;
}
```

---

## ⚙️ System & Configuration

### Get App Configuration

```http
GET /system/config
```

**Response:**
```typescript
interface SystemConfigResponse {
  features: {
    friendsSystem: boolean;
    receiptUploads: boolean;
    multiCurrency: boolean;
    groupExpenses: boolean;
    paymentIntegrations: boolean;
  };
  
  limits: {
    maxParticipants: number;
    maxExpenseAmount: number;
    maxReceiptSize: number;
    maxReceiptsPerExpense: number;
  };
  
  supportedCurrencies: string[];
  expenseCategories: ExpenseCategory[];
  paymentMethods: PaymentMethod[];
  
  version: string;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
}
```

### Health Check

```http
GET /health
```

**Response:**
```typescript
interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  services: {
    database: 'healthy' | 'degraded' | 'unhealthy';
    storage: 'healthy' | 'degraded' | 'unhealthy';
    authentication: 'healthy' | 'degraded' | 'unhealthy';
  };
}
```

---

## 🚦 Rate Limiting

All endpoints are rate-limited to prevent abuse:

| Endpoint Category | Rate Limit | Window |
|-------------------|------------|---------|
| Authentication | 10 requests | 1 minute |
| User Search | 20 requests | 5 minutes |
| Expense CRUD | 100 requests | 1 hour |
| File Upload | 50 requests | 1 hour |
| Dashboard/Analytics | 60 requests | 1 hour |

Rate limit headers are included in all responses:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1632847200
```

---

## 📝 Request Examples

### Create Simple Expense

```bash
curl -X POST https://us-central1-expense-flow.cloudfunctions.net/api/expenses \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Dinner at Italian restaurant",
    "amount": 8500,
    "currency": "USD",
    "category": "restaurants",
    "participants": [
      {"displayName": "Alice", "userId": "user123"},
      {"displayName": "Bob", "email": "bob@example.com"}
    ],
    "splitMethod": "equal"
  }'
```

### Mark Debt as Paid

```bash
curl -X POST https://us-central1-expense-flow.cloudfunctions.net/api/settlements \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "debtId": "user123__user456__exp_abc",
    "amount": 4250,
    "paymentMethod": "venmo",
    "paymentReference": "venmo_12345",
    "notes": "Thanks for dinner!"
  }'
```

---

**Next:** [Business Logic Documentation](../business-logic/rules.md)