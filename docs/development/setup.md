# Development Documentation

**Version:** 3.0  
**Last Updated:** September 17, 2025

## 🚀 Development Setup

### Prerequisites

Before starting development, ensure you have the following installed:

```bash
# Node.js (v18+ recommended)
node --version  # Should be 18.0.0 or higher
npm --version   # Should be 8.0.0 or higher

# Git
git --version

# PostgreSQL (v14+ recommended) - Optional if using Neon.tech
psql --version  # Should be 14.0 or higher

# Docker (Optional - for local PostgreSQL)
docker --version

# Optional but recommended
# VS Code with extensions:
# - ES7+ React/Redux/React-Native snippets
# - Prettier - Code formatter
# - ESLint
# - Tailwind CSS IntelliSense
# - Prisma
# - Thunder Client (for API testing)
```

### Initial Setup

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/expense-flow.git
cd expense-flow

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration (see below)

# 4. Set up database
npm run db:setup

# 5. Generate Prisma client
npm run db:generate

# 6. Run database migrations
npm run db:migrate

# 7. Seed database with sample data (optional)
npm run db:seed

# 8. Start development server
npm run dev
```

### Environment Configuration

Create `.env.local` file in the project root:

```bash
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/expense_flow_dev"

# Or use Neon.tech (recommended for development)
DATABASE_URL="postgresql://username:password@ep-your-endpoint.us-east-1.aws.neon.tech/expense_flow_dev?sslmode=require"

# NextAuth.js Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here-use-openssl-rand-base64-32"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Optional: Additional OAuth providers
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# File Upload Configuration
UPLOAD_DIR="/uploads"
MAX_FILE_SIZE="10485760"  # 10MB in bytes

# External Services (Optional)
REDIS_URL="redis://localhost:6379"
RESEND_API_KEY="your-resend-api-key"  # For email notifications

# Development Settings
NODE_ENV="development"
LOG_LEVEL="debug"

# Analytics (Optional)
NEXT_PUBLIC_ANALYTICS_ID="your-analytics-id"
SENTRY_DSN="your-sentry-dsn"
```

For production, create `.env.production`:

```bash
# Production Database (Neon.tech recommended)
DATABASE_URL="postgresql://username:password@ep-your-endpoint.us-east-1.aws.neon.tech/expense_flow_prod?sslmode=require"

# Production NextAuth Configuration
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-production-secret-key"

# Production OAuth Configuration
GOOGLE_CLIENT_ID="your-production-google-client-id"
GOOGLE_CLIENT_SECRET="your-production-google-client-secret"

# Production Settings
NODE_ENV="production"
LOG_LEVEL="info"
```

---

## 🔧 Development Scripts

### Package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "type-check": "tsc --noEmit",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,css,md}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,js,jsx,json,css,md}\"",
    
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:migrate:prod": "prisma migrate deploy",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio",
    "db:reset": "prisma migrate reset",
    "db:setup": "npm run db:generate && npm run db:migrate && npm run db:seed",
    "db:push": "prisma db push",
    
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    
    "build:analyze": "ANALYZE=true npm run build",
    "postbuild": "next-sitemap",
    
    "pre-commit": "lint-staged"
  }
}
```

### Database Setup Scripts

#### Local PostgreSQL with Docker

`docker-compose.yml`:

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    restart: always
    environment:
      POSTGRES_USER: expense_flow
      POSTGRES_PASSWORD: development
      POSTGRES_DB: expense_flow_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql

  redis:
    image: redis:7-alpine
    restart: always
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

#### Prisma Configuration

`prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// User model
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  image     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?

  // Auth relations
  accounts Account[]
  sessions Session[]

  // App relations
  createdExpenses    Expense[]            @relation("ExpenseCreator")
  expenseParticipants ExpenseParticipant[]
  settlementsPaid    Settlement[]         @relation("SettlementPayer")
  settlementsReceived Settlement[]        @relation("SettlementPayee")
  groupMemberships   GroupMember[]
  uploadedFiles      File[]

  @@map("users")
}

// NextAuth.js models
model Account {
  id                String  @id @default(cuid())
  userId            String  @map("user_id")
  type              String
  provider          String
  providerAccountId String  @map("provider_account_id")
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
  sessionToken String   @unique @map("session_token")
  userId       String   @map("user_id")
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

// Rest of the schema... (as defined in database documentation)
```

#### Database Seed Script

`prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create sample users
  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      email: 'alice@example.com',
      name: 'Alice Johnson',
      image: 'https://images.unsplash.com/photo-1494790108755-2616b612b1-5c8b5a4e6b6e'
    }
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      email: 'bob@example.com',
      name: 'Bob Smith',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d'
    }
  });

  const charlie = await prisma.user.upsert({
    where: { email: 'charlie@example.com' },
    update: {},
    create: {
      email: 'charlie@example.com',
      name: 'Charlie Brown',
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e'
    }
  });

  // Create sample group
  const group = await prisma.group.create({
    data: {
      name: 'Weekend Trip',
      description: 'Our amazing weekend getaway',
      members: {
        create: [
          { userId: alice.id, role: 'ADMIN' },
          { userId: bob.id, role: 'MEMBER' },
          { userId: charlie.id, role: 'MEMBER' }
        ]
      }
    }
  });

  // Create sample expenses
  const expense1 = await prisma.expense.create({
    data: {
      description: 'Dinner at Pizza Palace',
      amount: 8550, // $85.50
      currency: 'USD',
      category: 'FOOD',
      splitType: 'EQUAL',
      createdBy: alice.id,
      groupId: group.id,
      participants: {
        create: [
          {
            userId: alice.id,
            shareAmount: 2850,
            status: 'CONFIRMED'
          },
          {
            userId: bob.id,
            shareAmount: 2850,
            status: 'PENDING'
          },
          {
            userId: charlie.id,
            shareAmount: 2850,
            status: 'PENDING'
          }
        ]
      }
    }
  });

  const expense2 = await prisma.expense.create({
    data: {
      description: 'Gas for road trip',
      amount: 12000, // $120.00
      currency: 'USD',
      category: 'TRANSPORT',
      splitType: 'EQUAL',
      createdBy: bob.id,
      groupId: group.id,
      participants: {
        create: [
          {
            userId: alice.id,
            shareAmount: 4000,
            status: 'PENDING'
          },
          {
            userId: bob.id,
            shareAmount: 4000,
            status: 'CONFIRMED'
          },
          {
            userId: charlie.id,
            shareAmount: 4000,
            status: 'PENDING'
          }
        ]
      }
    }
  });

  // Create sample settlement
  await prisma.settlement.create({
    data: {
      amount: 2850,
      payerId: bob.id,
      payeeId: alice.id,
      description: 'Pizza dinner split',
      method: 'VENMO',
      status: 'COMPLETED'
    }
  });

  console.log('✅ Database seeded successfully!');
  console.log(`Created users: Alice (${alice.id}), Bob (${bob.id}), Charlie (${charlie.id})`);
  console.log(`Created group: ${group.name} (${group.id})`);
  console.log(`Created expenses: Pizza dinner, Gas for trip`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

## 🧪 Testing Strategy

### Unit Testing with Jest

`jest.config.js`:

```javascript
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleDirectories: ['node_modules', '<rootDir>/'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/app/(.*)$': '<rootDir>/src/app/$1'
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
    '!src/app/layout.tsx',
    '!src/app/globals.css'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/tests/e2e/'
  ]
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
```

### Test Setup

`jest.setup.js`:

```javascript
import '@testing-library/jest-dom';
import { loadEnvConfig } from '@next/env';
import { beforeAll, afterEach, afterAll } from '@jest/globals';
import { setupServer } from 'msw/node';
import { rest } from 'msw';

// Load environment variables
loadEnvConfig(process.cwd());

// Mock Prisma client
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    expense: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    settlement: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

// Mock NextAuth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('next-auth', () => ({
  default: jest.fn(),
}));

// Mock file uploads
global.FormData = FormData;
global.File = File;
global.Blob = Blob;

// Setup MSW server for API mocking
const server = setupServer(
  rest.get('/api/expenses', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: []
      })
    );
  }),
  rest.post('/api/expenses', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: { id: 'test-expense-1' }
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  unobserve: jest.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  unobserve: jest.fn(),
}));
```

### Example Unit Tests

`src/components/__tests__/ExpenseCard.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { ExpenseCard } from '../ExpenseCard';
import type { Expense } from '@/types';

const mockExpense: Expense = {
  id: 'test-expense-1',
  description: 'Test Dinner',
  amount: 5000, // $50.00
  currency: 'USD',
  category: 'FOOD',
  splitType: 'EQUAL',
  createdBy: 'user1',
  groupId: null,
  createdAt: new Date('2025-09-17T10:00:00Z'),
  updatedAt: new Date('2025-09-17T10:00:00Z'),
  participants: [
    {
      id: 'p1',
      userId: 'user1',
      expenseId: 'test-expense-1',
      shareAmount: 2500,
      status: 'CONFIRMED',
      user: { name: 'Alice', email: 'alice@test.com', image: null }
    },
    {
      id: 'p2',
      userId: 'user2',
      expenseId: 'test-expense-1',
      shareAmount: 2500,
      status: 'PENDING',
      user: { name: 'Bob', email: 'bob@test.com', image: null }
    }
  ],
  creator: { name: 'Alice', email: 'alice@test.com', image: null }
};

describe('ExpenseCard', () => {
  it('renders expense information correctly', () => {
    render(<ExpenseCard expense={mockExpense} />);
    
    expect(screen.getByText('Test Dinner')).toBeInTheDocument();
    expect(screen.getByText('$50.00')).toBeInTheDocument();
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('2 participants')).toBeInTheDocument();
  });
  
  it('shows correct status based on participants', () => {
    render(<ExpenseCard expense={mockExpense} />);
    
    // Should show pending because one participant hasn't confirmed
    const statusBadge = screen.getByText('Pending');
    expect(statusBadge).toBeInTheDocument();
    expect(statusBadge).toHaveClass('bg-yellow-100', 'text-yellow-800');
  });
  
  it('handles click events correctly', () => {
    const mockOnClick = jest.fn();
    render(<ExpenseCard expense={mockExpense} onClick={mockOnClick} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(mockOnClick).toHaveBeenCalledWith(mockExpense.id);
  });
});
```

### API Route Testing

`src/app/api/expenses/__tests__/route.test.ts`:

```typescript
import { createMocks } from 'node-mocks-http';
import { POST } from '../route';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';

// Mock dependencies
jest.mock('@/lib/prisma');
jest.mock('next-auth/next');

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

describe('/api/expenses', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('creates expense successfully', async () => {
      // Setup mocks
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'test@example.com' }
      } as any);

      mockPrisma.$transaction.mockResolvedValue({
        id: 'expense-1',
        description: 'Test Expense',
        amount: 5000,
        // ... other expense fields
      });

      const { req } = createMocks({
        method: 'POST',
        body: {
          description: 'Test Expense',
          amount: 50.00,
          currency: 'USD',
          category: 'FOOD',
          splitType: 'EQUAL',
          participants: [
            { userId: 'user1' },
            { userId: 'user2' }
          ]
        }
      });

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('expense-1');
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('returns 401 for unauthenticated requests', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const { req } = createMocks({
        method: 'POST',
        body: { description: 'Test' }
      });

      const response = await POST(req as any);
      expect(response.status).toBe(401);
    });

    it('validates request body', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'test@example.com' }
      } as any);

      const { req } = createMocks({
        method: 'POST',
        body: {
          // Missing required fields
          description: ''
        }
      });

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
```

### Integration Testing with Prisma

`tests/integration/expense-flow.test.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { createExpense } from '@/lib/services/expense-service';

const prisma = new PrismaClient();

describe('Expense Flow Integration', () => {
  beforeAll(async () => {
    // Clean up test data
    await prisma.settlement.deleteMany();
    await prisma.expenseParticipant.deleteMany();
    await prisma.expense.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates expense and calculates debts correctly', async () => {
    // Create test users
    const alice = await prisma.user.create({
      data: {
        email: 'alice@test.com',
        name: 'Alice',
      }
    });

    const bob = await prisma.user.create({
      data: {
        email: 'bob@test.com',
        name: 'Bob',
      }
    });

    // Create expense
    const expense = await createExpense({
      description: 'Test Dinner',
      amount: 100.00,
      currency: 'USD',
      category: 'FOOD',
      splitType: 'EQUAL',
      participants: [
        { userId: alice.id },
        { userId: bob.id }
      ]
    }, alice.id);

    // Verify expense was created
    expect(expense.id).toBeDefined();
    expect(expense.amount).toBe(10000); // Stored in cents
    expect(expense.participants).toHaveLength(2);

    // Verify participants have correct shares
    const aliceParticipation = expense.participants.find(p => p.userId === alice.id);
    const bobParticipation = expense.participants.find(p => p.userId === bob.id);

    expect(aliceParticipation?.shareAmount).toBe(5000); // $50 in cents
    expect(bobParticipation?.shareAmount).toBe(5000);
    expect(aliceParticipation?.status).toBe('CONFIRMED'); // Creator auto-confirms
    expect(bobParticipation?.status).toBe('PENDING');
  });
});
```

### E2E Testing with Playwright

`playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

`tests/e2e/expense-flow.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Expense Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as test user
    await page.goto('/auth/signin');
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="signin-button"]');
    await page.waitForURL('/dashboard');
  });

  test('creates and settles an expense', async ({ page }) => {
    // Create expense
    await page.click('[data-testid="add-expense-btn"]');
    await page.fill('[data-testid="description"]', 'Dinner at Pizza Palace');
    await page.fill('[data-testid="amount"]', '85.50');
    await page.selectOption('[data-testid="category"]', 'FOOD');

    // Add participant
    await page.click('[data-testid="add-participant-btn"]');
    await page.fill('[data-testid="participant-search"]', 'friend@test.com');
    await page.click('[data-testid="participant-suggestion"]');

    // Equal split
    await page.click('[data-testid="equal-split-btn"]');
    await page.click('[data-testid="create-expense-btn"]');

    // Verify expense created
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
    await expect(page.locator('[data-testid="expense-list"]')).toContainText('Dinner at Pizza Palace');

    // Navigate to settlements
    await page.click('[data-testid="settlements-tab"]');
    await page.click('[data-testid="settle-debt-btn"]');

    // Mark as paid
    await page.selectOption('[data-testid="payment-method"]', 'VENMO');
    await page.fill('[data-testid="payment-reference"]', 'venmo-123456');
    await page.click('[data-testid="confirm-settlement-btn"]');

    // Verify settlement
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
    await expect(page.locator('[data-testid="debt-status"]')).toContainText('Paid');
  });

  test('validates expense creation form', async ({ page }) => {
    await page.goto('/expenses/create');

    // Try to submit empty form
    await page.click('[data-testid="create-expense-btn"]');

    // Check validation errors
    await expect(page.locator('[data-testid="description-error"]')).toContainText('Description is required');
    await expect(page.locator('[data-testid="amount-error"]')).toContainText('Amount must be positive');

    // Test amount validation
    await page.fill('[data-testid="amount"]', '-10');
    await page.click('[data-testid="create-expense-btn"]');
    await expect(page.locator('[data-testid="amount-error"]')).toContainText('Amount must be positive');

    // Test large amount validation
    await page.fill('[data-testid="amount"]', '1000001');
    await page.click('[data-testid="create-expense-btn"]');
    await expect(page.locator('[data-testid="amount-error"]')).toContainText('Amount cannot exceed $1,000,000');
  });
});
```

---

## 🏗 Project Structure

```
expense-flow/
├── src/
│   ├── app/                     # Next.js 14 App Router
│   │   ├── (auth)/             # Auth route group
│   │   │   ├── signin/
│   │   │   └── signup/
│   │   ├── (dashboard)/        # Protected route group
│   │   │   ├── dashboard/
│   │   │   ├── expenses/
│   │   │   ├── settlements/
│   │   │   ├── groups/
│   │   │   └── settings/
│   │   ├── api/                # API routes
│   │   │   ├── auth/           # NextAuth.js API routes
│   │   │   ├── expenses/
│   │   │   ├── settlements/
│   │   │   ├── groups/
│   │   │   ├── users/
│   │   │   └── upload/
│   │   ├── globals.css         # Global styles
│   │   ├── layout.tsx          # Root layout
│   │   ├── loading.tsx         # Global loading UI
│   │   ├── error.tsx           # Global error UI
│   │   ├── not-found.tsx       # 404 page
│   │   └── page.tsx            # Home page
│   ├── components/             # Reusable components
│   │   ├── ui/                 # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   └── ...
│   │   ├── forms/              # Form components
│   │   │   ├── expense-form.tsx
│   │   │   ├── settlement-form.tsx
│   │   │   └── group-form.tsx
│   │   ├── expense/            # Expense-specific components
│   │   │   ├── expense-card.tsx
│   │   │   ├── expense-list.tsx
│   │   │   ├── split-calculator.tsx
│   │   │   └── participant-selector.tsx
│   │   ├── settlement/         # Settlement components
│   │   │   ├── settlement-list.tsx
│   │   │   ├── debt-summary.tsx
│   │   │   └── payment-form.tsx
│   │   └── layout/             # Layout components
│   │       ├── header.tsx
│   │       ├── navigation.tsx
│   │       ├── sidebar.tsx
│   │       └── footer.tsx
│   ├── lib/                    # Utilities and configurations
│   │   ├── auth.ts             # NextAuth.js configuration
│   │   ├── prisma.ts           # Prisma client
│   │   ├── validations.ts      # Zod schemas
│   │   ├── utils.ts            # General utilities
│   │   ├── currency.ts         # Currency formatting
│   │   ├── date.ts             # Date utilities
│   │   └── calculations.ts     # Split calculations
│   ├── hooks/                  # Custom React hooks
│   │   ├── use-expenses.ts     # Expense management
│   │   ├── use-settlements.ts  # Settlement management
│   │   ├── use-debts.ts        # Debt calculations
│   │   ├── use-groups.ts       # Group management
│   │   └── use-auth.ts         # Authentication helpers
│   ├── stores/                 # Zustand stores (if needed)
│   │   ├── expense-store.ts
│   │   └── ui-store.ts
│   ├── types/                  # TypeScript definitions
│   │   ├── index.ts            # Main type exports
│   │   ├── api.ts              # API types
│   │   ├── expense.ts          # Expense types
│   │   ├── user.ts             # User types
│   │   └── settlement.ts       # Settlement types
│   └── middleware.ts           # Next.js middleware
├── prisma/                     # Database schema and migrations
│   ├── schema.prisma           # Database schema
│   ├── seed.ts                 # Database seeding
│   └── migrations/             # Database migrations
├── tests/                      # Test files
│   ├── e2e/                    # Playwright E2E tests
│   ├── integration/            # Integration tests
│   └── __mocks__/              # Test mocks
├── docs/                       # Documentation
├── public/                     # Static assets
│   ├── images/
│   ├── icons/
│   └── favicon.ico
├── uploads/                    # File uploads (development)
├── .env.example                # Environment template
├── .env.local                  # Development environment
├── docker-compose.yml          # Local development services
├── next.config.js              # Next.js configuration
├── tailwind.config.js          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
├── jest.config.js              # Jest configuration
├── playwright.config.ts        # Playwright configuration
├── components.json             # shadcn/ui configuration
├── package.json
└── README.md
```

### Key Architecture Decisions

1. **Next.js App Router**: Uses the modern App Router for better developer experience and performance
2. **Route Groups**: Organizes routes with authentication boundaries using `(auth)` and `(dashboard)` groups
3. **API Routes**: Co-located with frontend code for full-stack development
4. **Component Organization**: Separates UI components from business logic components
5. **Type Safety**: Comprehensive TypeScript coverage with Prisma-generated types
6. **Database-First**: Uses Prisma schema as the source of truth for data models

---

## 🔧 Code Standards & Guidelines

### Next.js Configuration

`next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  images: {
    domains: ['lh3.googleusercontent.com', 'avatars.githubusercontent.com'],
    formats: ['image/webp', 'image/avif'],
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ];
  },
  webpack: (config, { dev, isServer }) => {
    // Bundle analyzer
    if (process.env.ANALYZE === 'true') {
      const withBundleAnalyzer = require('@next/bundle-analyzer')({
        enabled: true,
      });
      return withBundleAnalyzer.webpack(config, { dev, isServer });
    }
    return config;
  },
};

module.exports = nextConfig;
```

### TypeScript Configuration

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/types/*": ["./src/types/*"],
      "@/app/*": ["./src/app/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### ESLint Configuration

`.eslintrc.json`:

```json
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/prefer-const": "error",
    "@typescript-eslint/no-non-null-assertion": "warn",
    "prefer-const": "error",
    "no-var": "error",
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "react-hooks/exhaustive-deps": "error",
    "import/order": [
      "error",
      {
        "groups": [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index"
        ],
        "newlines-between": "always",
        "alphabetize": {
          "order": "asc",
          "caseInsensitive": true
        }
      }
    ]
  },
  "settings": {
    "react": {
      "version": "detect"
    }
  }
}
```

### Prettier Configuration

`.prettierrc.json`:

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "avoid",
  "endOfLine": "lf",
  "bracketSpacing": true,
  "bracketSameLine": false
}
```

### Tailwind CSS Configuration

`tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
```

### Git Hooks with Husky

`.husky/pre-commit`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npm run pre-commit
```

`lint-staged` configuration in `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,css,md}": [
      "prettier --write"
    ],
    "*.{ts,tsx,js,jsx}": [
      "npm run type-check"
    ]
  }
}
```

### Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Types
feat: add new expense splitting algorithm
fix: resolve settlement confirmation bug
docs: update API documentation
style: format code with prettier
refactor: simplify debt calculation logic
test: add unit tests for split calculations
chore: update dependencies
perf: optimize database queries
ci: update GitHub Actions workflow

# Examples with scope
feat(api): add expense creation endpoint
fix(ui): resolve mobile navigation issue
docs(setup): update development guide
test(components): add ExpenseCard unit tests
perf(db): optimize expense queries with indexes
```

---

## 🚀 Deployment

### Vercel Deployment

#### Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com) with GitHub
2. **GitHub Repository**: Push code to GitHub repository
3. **Neon PostgreSQL**: Production database setup at [neon.tech](https://neon.tech)

#### Environment Variables Setup

In Vercel dashboard, configure these environment variables:

```bash
# Database
DATABASE_URL="postgresql://username:password@host/database?sslmode=require"

# NextAuth.js
NEXTAUTH_SECRET="your-super-secret-key-32-chars-min"
NEXTAUTH_URL="https://your-app-domain.vercel.app"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"

# File Storage (Optional)
UPLOADTHING_SECRET="your-uploadthing-secret"
UPLOADTHING_APP_ID="your-uploadthing-app-id"

# Analytics (Optional)
NEXT_PUBLIC_VERCEL_ANALYTICS=true
```

#### Automatic Deployment

1. **Connect Repository**: Link GitHub repo to Vercel
2. **Configure Build**: Vercel auto-detects Next.js project
3. **Database Migration**: Add build command in `vercel.json`:

```json
{
  "buildCommand": "npm run build && npx prisma migrate deploy",
  "devCommand": "npm run dev",
  "installCommand": "npm install && npx prisma generate",
  "functions": {
    "app/api/**/*.js": {
      "maxDuration": 30
    }
  },
  "regions": ["iad1"],
  "env": {
    "DATABASE_URL": "@database_url",
    "NEXTAUTH_SECRET": "@nextauth_secret",
    "NEXTAUTH_URL": "@nextauth_url"
  }
}
```

#### Custom Deployment Scripts

`package.json` deployment scripts:

```json
{
  "scripts": {
    "build": "next build",
    "deploy:preview": "vercel",
    "deploy:production": "vercel --prod",
    "postbuild": "npx prisma generate",
    "vercel-build": "npx prisma generate && npx prisma migrate deploy && next build"
  }
}
```

#### Database Migration Strategy

For production deployments:

```bash
# 1. Generate migration files locally
npx prisma migrate dev --name "migration-description"

# 2. Commit migration files to git
git add prisma/migrations/
git commit -m "feat(db): add new migration"

# 3. Deploy will automatically run migrations
git push origin main  # Triggers Vercel deployment

# 4. Verify migration in production
npx prisma migrate status --schema=./prisma/schema.prisma
```

### Manual Deployment Options

#### Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy preview (development)
vercel

# Deploy to production
vercel --prod

# View deployment logs
vercel logs [deployment-url]
```

#### Docker Deployment (Alternative)

`Dockerfile`:

```dockerfile
FROM node:18-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

USER nextjs
EXPOSE 3000
ENV PORT 3000

CMD ["npm", "start"]
```

`docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
    depends_on:
      - postgres

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: expenseflow
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

### Domain Configuration

#### Custom Domain Setup

1. **Add Domain in Vercel**:
   - Go to Project Settings → Domains
   - Add your custom domain
   - Configure DNS records as instructed

2. **SSL Certificate**:
   - Vercel automatically provisions SSL certificates
   - Enforce HTTPS in `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          }
        ]
      }
    ];
  }
};
```

### Performance Optimization

#### Build Optimization

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  experimental: {
    optimizeCss: true,
    optimizeServerReact: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
  },
  poweredByHeader: false,
  compress: true,
  swcMinify: true,
};
```

#### Database Connection Optimization

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### CI/CD with GitHub Actions

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: testdb
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Generate Prisma client
        run: npx prisma generate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/testdb
      
      - name: Run database migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/testdb
      
      - name: Run type check
        run: npm run type-check
      
      - name: Run linting
        run: npm run lint
      
      - name: Run unit tests
        run: npm run test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/testdb
      
      - name: Run E2E tests
        run: npm run test:e2e:ci
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/testdb
          NEXTAUTH_SECRET: test-secret-key-for-testing-only
          NEXTAUTH_URL: http://localhost:3000

  deploy-preview:
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Vercel Preview
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          scope: ${{ secrets.VERCEL_ORG_ID }}

  deploy-production:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Vercel Production
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          scope: ${{ secrets.VERCEL_ORG_ID }}
```

### Environment Management

#### Multiple Environments

```bash
# Development
DATABASE_URL="postgresql://localhost:5432/expenseflow_dev"
NEXTAUTH_URL="http://localhost:3000"

# Staging
DATABASE_URL="postgresql://staging-host/expenseflow_staging"
NEXTAUTH_URL="https://staging.yourapp.com"

# Production
DATABASE_URL="postgresql://prod-host/expenseflow_prod"
NEXTAUTH_URL="https://yourapp.com"
```

#### Secrets Management

Store sensitive data in Vercel environment variables:

```bash
# Using Vercel CLI
vercel env add NEXTAUTH_SECRET production
vercel env add GOOGLE_CLIENT_SECRET production
vercel env add DATABASE_URL production

# Or use .env.local for local development only
echo "NEXTAUTH_SECRET=your-secret" >> .env.local
echo ".env.local" >> .gitignore
---

**This completes the comprehensive development setup documentation for the Next.js-based Expense Flow project.**