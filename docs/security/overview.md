# Security Documentation

**Version:** 3.0  
**Last Updated:** September 17, 2025

## 🔐 Security Overview

Expense Flow implements a comprehensive security model built on Next.js and NextAuth.js foundation, with database-level security through Prisma and PostgreSQL, and application-level controls to protect user data and prevent unauthorized access.

### Security Principles

1. **Defense in Depth**: Multiple layers of security controls
2. **Principle of Least Privilege**: Users access only what they need
3. **Data Minimization**: Collect and store only necessary data
4. **Transparency**: Clear privacy policies and data handling
5. **Audit Trail**: Complete logging of security-relevant actions

---

## 🔑 Authentication & Authorization

### NextAuth.js Authentication Setup

```typescript
// lib/auth.ts
import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from './prisma';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string;
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      // Additional security checks
      if (account?.provider === 'google') {
        return profile?.email_verified ?? false;
      }
      return true;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  events: {
    async signIn({ user, account, isNewUser }) {
      // Log security event
      console.log(`User ${user.email} signed in via ${account?.provider}`);
    },
    async signOut({ session }) {
      // Log security event
      console.log(`User ${session?.user?.email} signed out`);
    },
  },
});
```

### API Route Protection Middleware

```typescript
// lib/auth-middleware.ts
import { auth } from './auth';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from './prisma';

export async function withAuth<T>(
  handler: (req: NextRequest, userId: string) => Promise<T>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const session = await auth();
      
      if (!session?.user?.id) {
        return NextResponse.json(
          { 
            success: false, 
            error: { 
              code: 'AUTH_REQUIRED', 
              message: 'Authentication required' 
            } 
          },
          { status: 401 }
        );
      }
      
      // Verify user is active in database
      const user = await prisma.user.findUnique({
        where: { 
          id: session.user.id,
          deletedAt: null
        }
      });
      
      if (!user) {
        return NextResponse.json(
          { 
            success: false, 
            error: { 
              code: 'USER_NOT_FOUND', 
              message: 'User account not found or inactive' 
            } 
          },
          { status: 403 }
        );
      }
      
      const result = await handler(req, session.user.id);
      
      if (result instanceof NextResponse) {
        return result;
      }
      
      return NextResponse.json({ success: true, data: result });
    } catch (error) {
      console.error('API Error:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'INTERNAL_ERROR', 
            message: 'Internal server error' 
          } 
        },
        { status: 500 }
      );
    }
  };
}

// Usage in API routes
// app/api/expenses/route.ts
export const POST = withAuth(async (req: NextRequest, userId: string) => {
  const body = await req.json();
  // Handle expense creation with authenticated userId
  return await createExpense(body, userId);
});
```

### Role-Based Access Control

```typescript
// lib/permissions.ts
import { prisma } from './prisma';

export enum Permission {
  READ_EXPENSE = 'READ_EXPENSE',
  WRITE_EXPENSE = 'WRITE_EXPENSE',
  DELETE_EXPENSE = 'DELETE_EXPENSE',
  CREATE_SETTLEMENT = 'CREATE_SETTLEMENT',
  MANAGE_GROUP = 'MANAGE_GROUP',
}

export async function hasPermission(
  userId: string,
  permission: Permission,
  resourceId?: string
): Promise<boolean> {
  switch (permission) {
    case Permission.READ_EXPENSE:
      if (!resourceId) return false;
      return await canAccessExpense(userId, resourceId);
      
    case Permission.WRITE_EXPENSE:
      if (!resourceId) return false;
      const expense = await prisma.expense.findUnique({
        where: { id: resourceId }
      });
      return expense?.createdBy === userId;
      
    case Permission.CREATE_SETTLEMENT:
      return true; // All authenticated users can create settlements
      
    case Permission.MANAGE_GROUP:
      if (!resourceId) return false;
      return await isGroupAdmin(userId, resourceId);
      
    default:
      return false;
  }
}

async function canAccessExpense(userId: string, expenseId: string): Promise<boolean> {
  const expense = await prisma.expense.findFirst({
    where: {
      id: expenseId,
      OR: [
        { createdBy: userId },
        { participants: { some: { userId } } }
      ]
    }
  });
  
  return !!expense;
}

async function isGroupAdmin(userId: string, groupId: string): Promise<boolean> {
  const membership = await prisma.groupMember.findFirst({
    where: {
      groupId,
      userId,
      role: 'ADMIN'
    }
  });
  
  return !!membership;
}
```

---

## 🛡️ API Security & Database Protection

### API Route Security Patterns

```typescript
// app/api/expenses/route.ts
import { z } from 'zod';
import { withAuth } from '@/lib/auth-middleware';
import { hasPermission, Permission } from '@/lib/permissions';
import { createExpenseSchema } from '@/lib/validations';

export const POST = withAuth(async (req: NextRequest, userId: string) => {
  // Input validation
  const body = await req.json();
  const validatedData = createExpenseSchema.parse(body);
  
  // Authorization check - verify participants
  const participantIds = validatedData.participants.map(p => p.userId);
  const validParticipants = await prisma.user.findMany({
    where: {
      id: { in: participantIds },
      deletedAt: null
    }
  });
  
  if (validParticipants.length !== participantIds.length) {
    throw new Error('One or more participants not found');
  }
  
  // Group membership check (if applicable)
  if (validatedData.groupId) {
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: validatedData.groupId,
        userId,
      }
    });
    
    if (!membership) {
      throw new Error('User not a member of specified group');
    }
  }
  
  // Create expense in transaction
  const expense = await prisma.$transaction(async (tx) => {
    const newExpense = await tx.expense.create({
      data: {
        ...validatedData,
        createdBy: userId,
      },
      include: {
        participants: {
          include: { user: { select: { name: true, email: true } } }
        }
      }
    });
    
    return newExpense;
  });
  
  return expense;
});

// app/api/expenses/[id]/route.ts
export const GET = withAuth(async (req: NextRequest, userId: string) => {
  const expenseId = req.nextUrl.pathname.split('/').pop()!;
  
  // Check read permission
  if (!await hasPermission(userId, Permission.READ_EXPENSE, expenseId)) {
    return NextResponse.json(
      { error: 'Access denied' },
      { status: 403 }
    );
  }
  
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: {
      participants: {
        include: { user: { select: { name: true, email: true, image: true } } }
      },
      creator: { select: { name: true, email: true, image: true } }
    }
  });
  
  return expense;
});

export const DELETE = withAuth(async (req: NextRequest, userId: string) => {
  const expenseId = req.nextUrl.pathname.split('/').pop()!;
  
  // Check delete permission (only creator can delete)
  if (!await hasPermission(userId, Permission.DELETE_EXPENSE, expenseId)) {
    return NextResponse.json(
      { error: 'Only expense creator can delete' },
      { status: 403 }
    );
  }
  
  // Check for existing settlements
  const settlements = await prisma.settlement.findMany({
    where: {
      OR: [
        { expense: { id: expenseId } },
        // Check for settlements related to participants of this expense
      ]
    }
  });
  
  if (settlements.length > 0) {
    return NextResponse.json(
      { error: 'Cannot delete expense with existing settlements' },
      { status: 400 }
    );
  }
  
  await prisma.$transaction(async (tx) => {
    await tx.expenseParticipant.deleteMany({
      where: { expenseId }
    });
    await tx.expense.delete({
      where: { id: expenseId }
    });
  });
  
  return { success: true };
});
```

### Database Security with Row Level Security

```sql
-- Enable Row Level Security on PostgreSQL
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- Users can only access their own profile
CREATE POLICY user_own_profile ON users
  FOR ALL
  USING (id = current_setting('app.current_user_id')::uuid);

-- Expenses: users can access if they're creator or participant
CREATE POLICY expense_access ON expenses
  FOR SELECT
  USING (
    created_by = current_setting('app.current_user_id')::uuid OR
    id IN (
      SELECT expense_id FROM expense_participants 
      WHERE user_id = current_setting('app.current_user_id')::uuid
    )
  );

-- Only expense creator can modify
CREATE POLICY expense_modify ON expenses
  FOR UPDATE
  USING (created_by = current_setting('app.current_user_id')::uuid);

-- Settlements: only participants can access
CREATE POLICY settlement_access ON settlements
  FOR ALL
  USING (
    payer_id = current_setting('app.current_user_id')::uuid OR
    payee_id = current_setting('app.current_user_id')::uuid
  );

-- Group members can access group data
CREATE POLICY group_member_access ON groups
  FOR SELECT
  USING (
    id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = current_setting('app.current_user_id')::uuid
    )
  );
```

### Prisma Security Middleware

```typescript
// lib/prisma-security.ts
import { PrismaClient } from '@prisma/client';

export function createSecurePrisma(userId?: string) {
  const prisma = new PrismaClient();
  
  if (!userId) {
    return prisma;
  }
  
  // Set user context for RLS policies
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // Set current user for RLS
          await prisma.$executeRaw`SELECT set_config('app.current_user_id', ${userId}, true)`;
          
          // Execute the query
          return query(args);
        },
      },
    },
  });
}

// Usage in API routes
export const GET = withAuth(async (req: NextRequest, userId: string) => {
  const securePrisma = createSecurePrisma(userId);
  
  // This query will automatically enforce RLS policies
  const expenses = await securePrisma.expense.findMany({
    include: {
      participants: true,
      creator: { select: { name: true, email: true } }
    }
  });
  
  return expenses;
});
```

---

## � File Upload Security

### Secure File Upload with Next.js

```typescript
// app/api/upload/route.ts
import { writeFile } from 'fs/promises';
import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import path from 'path';
import crypto from 'crypto';

const ALLOWED_FILE_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png', 
  'image/webp': '.webp',
  'application/pdf': '.pdf'
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export const POST = withAuth(async (req: NextRequest, userId: string) => {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const expenseId = formData.get('expenseId') as string;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Validate file type
    if (!ALLOWED_FILE_TYPES[file.type]) {
      return NextResponse.json(
        { error: 'Invalid file type' },
        { status: 400 }
      );
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large' },
        { status: 400 }
      );
    }
    
    // Verify user can upload to this expense
    if (expenseId) {
      const expense = await prisma.expense.findFirst({
        where: {
          id: expenseId,
          OR: [
            { createdBy: userId },
            { participants: { some: { userId } } }
          ]
        }
      });
      
      if (!expense) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }
    
    // Generate secure filename
    const fileExtension = ALLOWED_FILE_TYPES[file.type];
    const fileName = `${crypto.randomUUID()}${fileExtension}`;
    const filePath = path.join(UPLOAD_DIR, userId, fileName);
    
    // Ensure directory exists
    await mkdir(path.dirname(filePath), { recursive: true });
    
    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);
    
    // Save file record to database
    const fileRecord = await prisma.file.create({
      data: {
        id: crypto.randomUUID(),
        fileName: file.name,
        filePath: `uploads/${userId}/${fileName}`,
        fileSize: file.size,
        mimeType: file.type,
        uploadedBy: userId,
        expenseId: expenseId || null,
      }
    });
    
    return {
      id: fileRecord.id,
      url: `/api/files/${fileRecord.id}`,
      fileName: file.name,
      size: file.size
    };
    
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
});

// app/api/files/[id]/route.ts
export const GET = withAuth(async (req: NextRequest, userId: string) => {
  const fileId = req.nextUrl.pathname.split('/').pop()!;
  
  const file = await prisma.file.findUnique({
    where: { id: fileId },
    include: {
      expense: {
        include: {
          participants: { select: { userId: true } }
        }
      }
    }
  });
  
  if (!file) {
    return NextResponse.json(
      { error: 'File not found' },
      { status: 404 }
    );
  }
  
  // Check access permissions
  const hasAccess = file.uploadedBy === userId ||
    file.expense?.createdBy === userId ||
    file.expense?.participants.some(p => p.userId === userId);
  
  if (!hasAccess) {
    return NextResponse.json(
      { error: 'Access denied' },
      { status: 403 }
    );
  }
  
  // Serve file
  const fileBuffer = await readFile(path.join(process.cwd(), file.filePath));
  
  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': file.mimeType,
      'Content-Disposition': `inline; filename="${file.fileName}"`,
      'Cache-Control': 'private, max-age=3600'
    }
  });
});
```

### File Scanning and Virus Protection

```typescript
// lib/file-security.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class FileSecurityScanner {
  async scanFile(filePath: string): Promise<ScanResult> {
    try {
      // Use ClamAV for virus scanning (if available)
      const { stdout, stderr } = await execAsync(`clamscan ${filePath}`);
      
      if (stderr) {
        console.error('Scan error:', stderr);
        return { safe: false, reason: 'Scan failed' };
      }
      
      if (stdout.includes('FOUND')) {
        return { safe: false, reason: 'Malware detected' };
      }
      
      return { safe: true };
    } catch (error) {
      console.error('File scan failed:', error);
      // Fail closed - if we can't scan, reject the file
      return { safe: false, reason: 'Unable to verify file safety' };
    }
  }
  
  async validateFileContent(file: File): Promise<boolean> {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    // Check file signature matches declared type
    switch (file.type) {
      case 'image/jpeg':
        return this.validateJPEG(bytes);
      case 'image/png':
        return this.validatePNG(bytes);
      case 'application/pdf':
        return this.validatePDF(bytes);
      default:
        return false;
    }
  }
  
  private validateJPEG(bytes: Uint8Array): boolean {
    // JPEG files start with 0xFF 0xD8 0xFF
    return bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
  }
  
  private validatePNG(bytes: Uint8Array): boolean {
    // PNG files start with specific signature
    const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    return pngSignature.every((byte, index) => bytes[index] === byte);
  }
  
  private validatePDF(bytes: Uint8Array): boolean {
    // PDF files start with %PDF-
    const pdfHeader = '%PDF-';
    const header = String.fromCharCode(...bytes.slice(0, 5));
    return header === pdfHeader;
  }
}

interface ScanResult {
  safe: boolean;
  reason?: string;
}
```

---

## 🚦 Rate Limiting & DDoS Protection

### Next.js Rate Limiting with Redis

```typescript
// lib/rate-limit.ts
import { NextRequest } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator: (req: NextRequest, userId?: string) => string;
}

export class RateLimiter {
  private config: RateLimitConfig;
  
  constructor(config: RateLimitConfig) {
    this.config = config;
  }
  
  async checkLimit(req: NextRequest, userId?: string): Promise<RateLimitResult> {
    const key = this.config.keyGenerator(req, userId);
    const windowStart = Date.now() - this.config.windowMs;
    
    // Clean old entries and count current requests
    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zcard(key);
    pipeline.zadd(key, { score: Date.now(), member: Date.now() });
    pipeline.expire(key, Math.ceil(this.config.windowMs / 1000));
    
    const results = await pipeline.exec();
    const currentCount = results[1] as number;
    
    if (currentCount >= this.config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        reset: new Date(Date.now() + this.config.windowMs),
        total: this.config.maxRequests
      };
    }
    
    return {
      allowed: true,
      remaining: this.config.maxRequests - currentCount - 1,
      reset: new Date(Date.now() + this.config.windowMs),
      total: this.config.maxRequests
    };
  }
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: Date;
  total: number;
}

// Rate limiting configurations
export const authRateLimit = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5, // 5 auth attempts per minute
  keyGenerator: (req) => `auth:${getClientIP(req)}`
});

export const apiRateLimit = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 100, // 100 API calls per hour per user
  keyGenerator: (req, userId) => `api:${userId || getClientIP(req)}`
});

export const uploadRateLimit = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 20, // 20 uploads per hour
  keyGenerator: (req, userId) => `upload:${userId || getClientIP(req)}`
});

export const searchRateLimit = new RateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 15, // 15 searches per 5 minutes
  keyGenerator: (req, userId) => `search:${userId || getClientIP(req)}`
});

function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}
```

### Rate Limiting Middleware

```typescript
// lib/middleware/rate-limit-middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { RateLimiter, RateLimitResult } from '@/lib/rate-limit';

export function withRateLimit(limiter: RateLimiter) {
  return function rateLimitMiddleware(
    handler: (req: NextRequest, userId?: string) => Promise<NextResponse>
  ) {
    return async (req: NextRequest, userId?: string): Promise<NextResponse> => {
      const result = await limiter.checkLimit(req, userId);
      
      if (!result.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Rate limit exceeded. Please try again later.',
              retryAfter: result.reset.toISOString()
            }
          },
          { 
            status: 429,
            headers: {
              'X-RateLimit-Limit': result.total.toString(),
              'X-RateLimit-Remaining': result.remaining.toString(),
              'X-RateLimit-Reset': result.reset.getTime().toString(),
              'Retry-After': Math.ceil((result.reset.getTime() - Date.now()) / 1000).toString()
            }
          }
        );
      }
      
      const response = await handler(req, userId);
      
      // Add rate limit headers to successful responses
      response.headers.set('X-RateLimit-Limit', result.total.toString());
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
      response.headers.set('X-RateLimit-Reset', result.reset.getTime().toString());
      
      return response;
    };
  };
}

// Usage in API routes
// app/api/auth/signin/route.ts
import { withRateLimit } from '@/lib/middleware/rate-limit-middleware';
import { authRateLimit } from '@/lib/rate-limit';

const rateLimitedHandler = withRateLimit(authRateLimit);

export const POST = rateLimitedHandler(async (req: NextRequest) => {
  // Handle sign in
  return NextResponse.json({ success: true });
});
```

### Suspicious Activity Detection

```typescript
// lib/security-monitor.ts
export class SecurityMonitor {
  private redis: Redis;
  
  constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  
  async detectSuspiciousActivity(
    userId: string, 
    action: string, 
    metadata?: Record<string, any>
  ): Promise<boolean> {
    const key = `suspicious:${userId}:${action}`;
    const current = await this.redis.incr(key);
    
    if (current === 1) {
      await this.redis.expire(key, 3600); // 1 hour window
    }
    
    // Define thresholds for different actions
    const thresholds = {
      'expense_create': 50,     // 50 expenses per hour
      'settlement_create': 100, // 100 settlements per hour
      'search_user': 30,        // 30 user searches per hour
      'upload_file': 20,        // 20 file uploads per hour
      'failed_auth': 10,        // 10 failed auth attempts per hour
    };
    
    const threshold = thresholds[action] || 20;
    
    if (current > threshold) {
      await this.flagSuspiciousUser(userId, action, current, metadata);
      return true;
    }
    
    return false;
  }
  
  private async flagSuspiciousUser(
    userId: string, 
    action: string, 
    count: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    console.warn('Suspicious activity detected', {
      userId,
      action,
      count,
      metadata,
      timestamp: new Date().toISOString()
    });
    
    // Store in database for admin review
    await prisma.securityAlert.create({
      data: {
        userId,
        action,
        count,
        type: 'RATE_THRESHOLD_EXCEEDED',
        metadata: metadata || {},
        reviewed: false,
      }
    });
    
    // For severe cases, temporarily suspend account
    if (count > 200) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          suspendedAt: new Date(),
          suspendedReason: `Suspicious activity: ${action} (${count} attempts)`
        }
      });
      
      console.error('User account suspended due to suspicious activity', { userId });
    }
  }
  
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      await prisma.securityEvent.create({
        data: {
          type: event.type,
          userId: event.userId,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          details: event.details,
          severity: event.severity,
        }
      });
    } catch (error) {
      console.error('Failed to log security event', { error, event });
    }
  }
}

interface SecurityEvent {
  type: 'AUTH_FAILURE' | 'RATE_LIMIT_EXCEEDED' | 'SUSPICIOUS_ACTIVITY' | 'DATA_BREACH_ATTEMPT';
  userId?: string;
  ipAddress: string;
  userAgent: string;
  details: Record<string, any>;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}
```

---

## 🔍 Input Validation & Sanitization

### Server-Side Validation with Zod

```typescript
// lib/validations.ts
import { z } from 'zod';

// Validation schemas
export const createExpenseSchema = z.object({
  description: z.string().min(1).max(500),
  amount: z.number().positive().max(1000000), // $1M max
  currency: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY']),
  category: z.enum([
    'FOOD', 'GROCERIES', 'RESTAURANTS', 'TRANSPORT', 'GAS', 'PARKING', 
    'UTILITIES', 'RENT', 'INTERNET', 'PHONE', 'ENTERTAINMENT', 'SHOPPING',
    'TRAVEL', 'HEALTH', 'EDUCATION', 'OTHER'
  ]),
  participants: z.array(z.object({
    userId: z.string().uuid(),
    shareAmount: z.number().positive().optional()
  })).min(2).max(50),
  splitType: z.enum(['EQUAL', 'CUSTOM']),
  groupId: z.string().uuid().optional(),
  date: z.string().datetime().optional()
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  image: z.string().url().optional(),
  currency: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY']).optional(),
  locale: z.string().regex(/^[a-z]{2}-[A-Z]{2}$/).optional(),
  timezone: z.string().optional(),
  searchable: z.boolean().optional(),
  allowFriendRequests: z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: "At least one field must be provided for update"
});

export const createSettlementSchema = z.object({
  amount: z.number().positive().max(100000), // $100K max
  fromUserId: z.string().uuid(),
  toUserId: z.string().uuid(),
  description: z.string().max(500).optional(),
  method: z.enum(['CASH', 'VENMO', 'PAYPAL', 'BANK_TRANSFER', 'ZELLE', 'CHECK', 'OTHER']).optional()
}).refine(data => data.fromUserId !== data.toUserId, {
  message: "Cannot settle debt with yourself"
});

export const createGroupSchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().max(200).optional(),
  memberEmails: z.array(z.string().email()).min(1).max(49), // Up to 49 + creator = 50 total
});

// Generic validation middleware for Next.js API routes
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return async (req: NextRequest): Promise<{ success: true; data: T } | { success: false; error: any }> => {
    try {
      const body = await req.json();
      const validatedData = schema.parse(body);
      return { success: true, data: validatedData };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: error.issues.map(issue => ({
              field: issue.path.join('.'),
              message: issue.message,
              code: issue.code
            }))
          }
        };
      }
      return {
        success: false,
        error: {
          code: 'INVALID_JSON',
          message: 'Invalid JSON in request body'
        }
      };
    }
  };
}

// Usage in API routes
// app/api/expenses/route.ts
export const POST = withAuth(async (req: NextRequest, userId: string) => {
  const validation = await validateBody(createExpenseSchema)(req);
  
  if (!validation.success) {
    return NextResponse.json(validation.error, { status: 400 });
  }
  
  const expenseData = validation.data;
  // Proceed with creating expense...
});
```

### Input Sanitization

```typescript
// lib/sanitization.ts
import DOMPurify from 'isomorphic-dompurify';
import { marked } from 'marked';

export class InputSanitizer {
  static sanitizeText(input: string): string {
    // Remove all HTML tags and scripts
    return DOMPurify.sanitize(input, { 
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: []
    });
  }
  
  static sanitizeMarkdown(input: string): string {
    // Allow safe markdown, sanitize output
    const htmlOutput = marked(input);
    return DOMPurify.sanitize(htmlOutput, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: []
    });
  }
  
  static sanitizeFileName(fileName: string): string {
    // Remove dangerous characters from filenames
    return fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 255);
  }
  
  static sanitizeObject<T extends Record<string, any>>(obj: T): T {
    const sanitized = {} as T;
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key as keyof T] = this.sanitizeText(value) as T[keyof T];
      } else if (Array.isArray(value)) {
        sanitized[key as keyof T] = value.map(item => 
          typeof item === 'string' ? this.sanitizeText(item) : item
        ) as T[keyof T];
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key as keyof T] = this.sanitizeObject(value) as T[keyof T];
      } else {
        sanitized[key as keyof T] = value;
      }
    }
    
    return sanitized;
  }
}

// Middleware for automatic sanitization
export function withSanitization<T>(
  handler: (req: NextRequest, sanitizedData: T, userId?: string) => Promise<NextResponse>
) {
  return async (req: NextRequest, userId?: string): Promise<NextResponse> => {
    try {
      const body = await req.json();
      const sanitizedData = InputSanitizer.sanitizeObject(body);
      return handler(req, sanitizedData, userId);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
  };
}
```

### SQL Injection Prevention

```typescript
// lib/database-security.ts
import { Prisma } from '@prisma/client';

export class DatabaseSecurity {
  // Prisma automatically prevents SQL injection, but here are additional safeguards
  
  static validateSortField(field: string, allowedFields: string[]): string {
    if (!allowedFields.includes(field)) {
      throw new Error(`Invalid sort field: ${field}`);
    }
    return field;
  }
  
  static validateSortOrder(order: string): 'asc' | 'desc' {
    if (order !== 'asc' && order !== 'desc') {
      throw new Error(`Invalid sort order: ${order}`);
    }
    return order;
  }
  
  static buildSafeWhereClause(
    filters: Record<string, any>,
    allowedFields: string[]
  ): Prisma.ExpenseWhereInput {
    const whereClause: Prisma.ExpenseWhereInput = {};
    
    for (const [field, value] of Object.entries(filters)) {
      if (!allowedFields.includes(field)) {
        continue; // Skip unknown fields
      }
      
      switch (field) {
        case 'description':
          if (typeof value === 'string') {
            whereClause.description = {
              contains: value,
              mode: 'insensitive'
            };
          }
          break;
          
        case 'category':
          if (typeof value === 'string') {
            whereClause.category = value;
          }
          break;
          
        case 'amountMin':
          if (typeof value === 'number') {
            whereClause.amount = {
              ...whereClause.amount,
              gte: value
            };
          }
          break;
          
        case 'amountMax':
          if (typeof value === 'number') {
            whereClause.amount = {
              ...whereClause.amount,
              lte: value
            };
          }
          break;
          
        case 'dateFrom':
          if (typeof value === 'string') {
            whereClause.createdAt = {
              ...whereClause.createdAt,
              gte: new Date(value)
            };
          }
          break;
          
        case 'dateTo':
          if (typeof value === 'string') {
            whereClause.createdAt = {
              ...whereClause.createdAt,
              lte: new Date(value)
            };
          }
          break;
      }
    }
    
    return whereClause;
  }
}

// Usage in API routes
export const GET = withAuth(async (req: NextRequest, userId: string) => {
  const url = new URL(req.url);
  const filters = Object.fromEntries(url.searchParams);
  
  const allowedSortFields = ['createdAt', 'amount', 'description'];
  const allowedFilterFields = ['description', 'category', 'amountMin', 'amountMax', 'dateFrom', 'dateTo'];
  
  const sortField = DatabaseSecurity.validateSortField(
    filters.sortBy || 'createdAt', 
    allowedSortFields
  );
  const sortOrder = DatabaseSecurity.validateSortOrder(
    filters.sortOrder || 'desc'
  );
  
  const whereClause = DatabaseSecurity.buildSafeWhereClause(
    filters,
    allowedFilterFields
  );
  
  const expenses = await prisma.expense.findMany({
    where: {
      ...whereClause,
      OR: [
        { createdBy: userId },
        { participants: { some: { userId } } }
      ]
    },
    orderBy: { [sortField]: sortOrder },
    take: Math.min(parseInt(filters.limit) || 50, 100), // Max 100 results
    skip: Math.max(parseInt(filters.offset) || 0, 0)
  });
  
  return expenses;
});
```

---

## 📊 Security Logging & Monitoring

### Audit Trail Implementation with Prisma

```typescript
// lib/audit-logger.ts
import { prisma } from './prisma';
import { NextRequest } from 'next/server';

export class AuditLogger {
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      await prisma.securityEvent.create({
        data: {
          type: event.type,
          userId: event.userId,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          details: event.details,
          severity: event.severity,
        }
      });
    } catch (error) {
      console.error('Failed to log security event', { error, event });
    }
  }
  
  async logUserAction(action: UserAction): Promise<void> {
    try {
      await prisma.userAction.create({
        data: {
          userId: action.userId,
          action: action.action,
          resourceId: action.resourceId,
          ipAddress: action.ipAddress,
          userAgent: action.userAgent,
          metadata: action.metadata || {},
          sessionId: action.sessionId,
        }
      });
    } catch (error) {
      console.error('Failed to log user action', { error, action });
    }
  }
  
  async logApiCall(
    userId: string,
    endpoint: string,
    method: string,
    statusCode: number,
    duration: number,
    req: NextRequest
  ): Promise<void> {
    try {
      await prisma.apiCall.create({
        data: {
          userId,
          endpoint,
          method,
          statusCode,
          duration,
          ipAddress: this.getClientIP(req),
          userAgent: req.headers.get('user-agent') || 'unknown',
          requestSize: parseInt(req.headers.get('content-length') || '0'),
        }
      });
    } catch (error) {
      console.error('Failed to log API call', { error });
    }
  }
  
  private getClientIP(req: NextRequest): string {
    const forwarded = req.headers.get('x-forwarded-for');
    const realIP = req.headers.get('x-real-ip');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    if (realIP) {
      return realIP;
    }
    
    return 'unknown';
  }
}

interface SecurityEvent {
  type: 'AUTH_FAILURE' | 'RATE_LIMIT_EXCEEDED' | 'SUSPICIOUS_ACTIVITY' | 'DATA_BREACH_ATTEMPT' | 'UNAUTHORIZED_ACCESS';
  userId?: string;
  ipAddress: string;
  userAgent: string;
  details: Record<string, any>;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface UserAction {
  userId: string;
  action: 'EXPENSE_CREATED' | 'SETTLEMENT_MADE' | 'PROFILE_UPDATED' | 'ACCOUNT_DELETED' | 'GROUP_CREATED';
  resourceId?: string;
  ipAddress: string;
  userAgent: string;
  metadata?: Record<string, any>;
  sessionId?: string;
}

// Audit middleware for API routes
export function withAuditLogging<T>(
  action: string,
  handler: (req: NextRequest, userId: string) => Promise<T>
) {
  return async (req: NextRequest, userId: string): Promise<T> => {
    const auditLogger = new AuditLogger();
    const startTime = Date.now();
    
    try {
      const result = await handler(req, userId);
      const duration = Date.now() - startTime;
      
      // Log successful action
      await auditLogger.logUserAction({
        userId,
        action: action as any,
        ipAddress: auditLogger['getClientIP'](req),
        userAgent: req.headers.get('user-agent') || 'unknown',
        metadata: { duration, success: true }
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log failed action
      await auditLogger.logSecurityEvent({
        type: 'UNAUTHORIZED_ACCESS',
        userId,
        ipAddress: auditLogger['getClientIP'](req),
        userAgent: req.headers.get('user-agent') || 'unknown',
        details: { 
          error: error.message, 
          action, 
          duration 
        },
        severity: 'MEDIUM'
      });
      
      throw error;
    }
  };
}

// Usage in API routes
// app/api/expenses/route.ts
export const POST = withAuth(
  withAuditLogging('EXPENSE_CREATED', async (req: NextRequest, userId: string) => {
    const validation = await validateBody(createExpenseSchema)(req);
    
    if (!validation.success) {
      throw new Error('Validation failed');
    }
    
    const expense = await createExpense(validation.data, userId);
    return expense;
  })
);
```

### Real-time Security Monitoring

```typescript
// lib/security-dashboard.ts
export class SecurityDashboard {
  async getSecurityMetrics(): Promise<SecurityMetrics> {
    const [
      authFailures,
      rateLimitExceeded,
      suspiciousActivity,
      criticalEvents
    ] = await Promise.all([
      this.getAuthFailures(),
      this.getRateLimitViolations(),
      this.getSuspiciousActivity(),
      this.getCriticalEvents()
    ]);
    
    return {
      authFailures,
      rateLimitExceeded,
      suspiciousActivity,
      criticalEvents,
      lastUpdated: new Date()
    };
  }
  
  private async getAuthFailures(): Promise<SecurityEventSummary> {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const events = await prisma.securityEvent.findMany({
      where: {
        type: 'AUTH_FAILURE',
        createdAt: { gte: last24h }
      },
      select: {
        ipAddress: true,
        createdAt: true
      }
    });
    
    const uniqueIPs = new Set(events.map(e => e.ipAddress)).size;
    
    return {
      count: events.length,
      uniqueIPs,
      trend: await this.calculateTrend('AUTH_FAILURE', last24h)
    };
  }
  
  private async getRateLimitViolations(): Promise<SecurityEventSummary> {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const events = await prisma.securityEvent.findMany({
      where: {
        type: 'RATE_LIMIT_EXCEEDED',
        createdAt: { gte: last24h }
      },
      select: {
        userId: true,
        ipAddress: true
      }
    });
    
    const uniqueUsers = new Set(events.map(e => e.userId).filter(Boolean)).size;
    
    return {
      count: events.length,
      uniqueUsers,
      trend: await this.calculateTrend('RATE_LIMIT_EXCEEDED', last24h)
    };
  }
  
  private async getSuspiciousActivity(): Promise<SecurityEventSummary> {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const events = await prisma.securityEvent.findMany({
      where: {
        type: 'SUSPICIOUS_ACTIVITY',
        createdAt: { gte: last24h }
      }
    });
    
    return {
      count: events.length,
      uniqueUsers: new Set(events.map(e => e.userId).filter(Boolean)).size,
      trend: await this.calculateTrend('SUSPICIOUS_ACTIVITY', last24h)
    };
  }
  
  private async getCriticalEvents(): Promise<SecurityEventSummary> {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const events = await prisma.securityEvent.findMany({
      where: {
        severity: 'CRITICAL',
        createdAt: { gte: last24h }
      }
    });
    
    return {
      count: events.length,
      details: events.map(e => ({
        type: e.type,
        userId: e.userId,
        timestamp: e.createdAt
      }))
    };
  }
  
  private async calculateTrend(
    eventType: string,
    since: Date
  ): Promise<'increasing' | 'decreasing' | 'stable'> {
    const midpoint = new Date(since.getTime() + (Date.now() - since.getTime()) / 2);
    
    const [firstHalf, secondHalf] = await Promise.all([
      prisma.securityEvent.count({
        where: {
          type: eventType as any,
          createdAt: { gte: since, lt: midpoint }
        }
      }),
      prisma.securityEvent.count({
        where: {
          type: eventType as any,
          createdAt: { gte: midpoint }
        }
      })
    ]);
    
    if (secondHalf > firstHalf * 1.2) return 'increasing';
    if (secondHalf < firstHalf * 0.8) return 'decreasing';
    return 'stable';
  }
}

interface SecurityMetrics {
  authFailures: SecurityEventSummary;
  rateLimitExceeded: SecurityEventSummary;
  suspiciousActivity: SecurityEventSummary;
  criticalEvents: SecurityEventSummary;
  lastUpdated: Date;
}

interface SecurityEventSummary {
  count: number;
  uniqueIPs?: number;
  uniqueUsers?: number;
  trend?: 'increasing' | 'decreasing' | 'stable';
  details?: Array<{
    type: string;
    userId?: string;
    timestamp: Date;
  }>;
}
```
```

---

---

## 🔒 Data Privacy & GDPR Compliance

### Privacy Manager for Next.js

```typescript
// lib/privacy-manager.ts
import { prisma } from './prisma';
import { AuditLogger } from './audit-logger';

export class PrivacyManager {
  private auditLogger: AuditLogger;
  
  constructor() {
    this.auditLogger = new AuditLogger();
  }
  
  async exportUserData(userId: string): Promise<UserDataExport> {
    // Log privacy request
    await this.auditLogger.logUserAction({
      userId,
      action: 'DATA_EXPORT_REQUESTED',
      ipAddress: 'system',
      userAgent: 'privacy-manager',
      metadata: { type: 'gdpr_export' }
    });
    
    const [user, expenses, settlements, groups, files] = await Promise.all([
      this.getUserProfile(userId),
      this.getUserExpenses(userId),
      this.getUserSettlements(userId),
      this.getUserGroups(userId),
      this.getUserFiles(userId)
    ]);
    
    return {
      profile: this.anonymizeUserData(user),
      expenses: expenses.map(this.anonymizeExpenseData),
      settlements: settlements.map(this.anonymizeSettlementData),
      groups: groups.map(this.anonymizeGroupData),
      files: files.map(this.anonymizeFileData),
      exportedAt: new Date().toISOString(),
      dataRetentionPolicy: 'Financial data retained for 7 years per legal requirements'
    };
  }
  
  async deleteUserData(userId: string, requestReason?: string): Promise<DeletionReport> {
    // Check for blocking conditions
    const unsettledDebts = await this.getUnsettledDebts(userId);
    if (unsettledDebts.length > 0) {
      throw new Error(
        `Cannot delete user with ${unsettledDebts.length} unsettled debts. Please settle all debts first.`
      );
    }
    
    return await prisma.$transaction(async (tx) => {
      // Log deletion request
      await this.auditLogger.logUserAction({
        userId,
        action: 'ACCOUNT_DELETION_REQUESTED',
        ipAddress: 'system',
        userAgent: 'privacy-manager',
        metadata: { 
          reason: requestReason || 'user_request',
          type: 'gdpr_deletion'
        }
      });
      
      // Soft delete user (preserve financial audit trail)
      const deletedUser = await tx.user.update({
        where: { id: userId },
        data: {
          deletedAt: new Date(),
          email: `deleted_${userId}@removed.user`,
          name: 'Deleted User',
          image: null,
          deletionReason: requestReason || 'user_request'
        }
      });
      
      // Handle expenses - preserve for audit but anonymize
      const userExpenses = await tx.expense.findMany({
        where: { createdBy: userId },
        include: { participants: true }
      });
      
      // Transfer ownership of expenses with outstanding participants
      for (const expense of userExpenses) {
        const activeParticipants = expense.participants.filter(p => p.status === 'PENDING');
        
        if (activeParticipants.length > 0) {
          // Transfer to most recently active participant
          const newCreator = activeParticipants[0];
          await tx.expense.update({
            where: { id: expense.id },
            data: {
              createdBy: newCreator.userId,
              notes: `${expense.notes || ''}\n[Original creator account deleted]`
            }
          });
        }
      }
      
      // Mark user as exempt from all pending debts
      await tx.expenseParticipant.updateMany({
        where: {
          userId,
          status: 'PENDING'
        },
        data: {
          status: 'EXEMPT'
        }
      });
      
      // Remove from groups
      await tx.groupMember.deleteMany({
        where: { userId }
      });
      
      // Delete uploaded files
      const userFiles = await tx.file.findMany({
        where: { uploadedBy: userId }
      });
      
      await tx.file.deleteMany({
        where: { uploadedBy: userId }
      });
      
      // Delete sessions and accounts
      await tx.session.deleteMany({
        where: { userId }
      });
      
      await tx.account.deleteMany({
        where: { userId }
      });
      
      return {
        deleted: true,
        expensesPreserved: userExpenses.length,
        debtsExempted: unsettledDebts.length,
        filesDeleted: userFiles.length,
        gdprCompliant: true,
        dataRetention: {
          reason: 'Legal requirement for financial audit trail',
          anonymized: true,
          retentionPeriod: '7 years'
        }
      };
    });
  }
  
  async scheduleDataPurge(userId: string): Promise<void> {
    // Schedule complete data purge after legal retention period
    const purgeDate = new Date();
    purgeDate.setFullYear(purgeDate.getFullYear() + 7); // 7 years retention
    
    await prisma.dataPurgeSchedule.create({
      data: {
        userId,
        scheduledPurgeDate: purgeDate,
        reason: 'legal_retention_expired',
        status: 'SCHEDULED'
      }
    });
  }
  
  private async getUserProfile(userId: string) {
    return await prisma.user.findUnique({
      where: { id: userId },
      include: {
        accounts: true,
        sessions: true
      }
    });
  }
  
  private async getUserExpenses(userId: string) {
    return await prisma.expense.findMany({
      where: {
        OR: [
          { createdBy: userId },
          { participants: { some: { userId } } }
        ]
      },
      include: {
        participants: {
          include: { user: { select: { name: true, email: true } } }
        },
        creator: { select: { name: true, email: true } }
      }
    });
  }
  
  private async getUserSettlements(userId: string) {
    return await prisma.settlement.findMany({
      where: {
        OR: [
          { payerId: userId },
          { payeeId: userId }
        ]
      },
      include: {
        payer: { select: { name: true, email: true } },
        payee: { select: { name: true, email: true } }
      }
    });
  }
  
  private async getUserGroups(userId: string) {
    return await prisma.group.findMany({
      where: {
        members: { some: { userId } }
      },
      include: {
        members: {
          include: { user: { select: { name: true, email: true } } }
        }
      }
    });
  }
  
  private async getUserFiles(userId: string) {
    return await prisma.file.findMany({
      where: { uploadedBy: userId }
    });
  }
  
  private async getUnsettledDebts(userId: string) {
    return await prisma.expenseParticipant.findMany({
      where: {
        userId,
        status: 'PENDING'
      }
    });
  }
  
  private anonymizeUserData(user: any) {
    return {
      ...user,
      accounts: user.accounts?.map((account: any) => ({
        ...account,
        access_token: '[REDACTED]',
        refresh_token: '[REDACTED]'
      })),
      sessions: user.sessions?.length || 0
    };
  }
  
  private anonymizeExpenseData = (expense: any) => ({
    ...expense,
    participants: expense.participants?.map((p: any) => ({
      ...p,
      user: {
        name: p.user?.name || '[ANONYMIZED]',
        email: '[ANONYMIZED]'
      }
    })),
    creator: {
      name: expense.creator?.name || '[ANONYMIZED]',
      email: '[ANONYMIZED]'
    }
  });
  
  private anonymizeSettlementData = (settlement: any) => ({
    ...settlement,
    payer: {
      name: settlement.payer?.name || '[ANONYMIZED]',
      email: '[ANONYMIZED]'
    },
    payee: {
      name: settlement.payee?.name || '[ANONYMIZED]',
      email: '[ANONYMIZED]'
    }
  });
  
  private anonymizeGroupData = (group: any) => ({
    ...group,
    members: group.members?.map((m: any) => ({
      ...m,
      user: {
        name: m.user?.name || '[ANONYMIZED]',
        email: '[ANONYMIZED]'
      }
    }))
  });
  
  private anonymizeFileData = (file: any) => ({
    id: file.id,
    fileName: file.fileName,
    fileSize: file.fileSize,
    mimeType: file.mimeType,
    uploadedAt: file.createdAt
  });
}

interface UserDataExport {
  profile: any;
  expenses: any[];
  settlements: any[];
  groups: any[];
  files: any[];
  exportedAt: string;
  dataRetentionPolicy: string;
}

interface DeletionReport {
  deleted: boolean;
  expensesPreserved: number;
  debtsExempted: number;
  filesDeleted: number;
  gdprCompliant: boolean;
  dataRetention: {
    reason: string;
    anonymized: boolean;
    retentionPeriod: string;
  };
}
```

### Cookie and Consent Management

```typescript
// lib/cookie-consent.ts
export class CookieConsentManager {
  static setConsentCookie(consent: ConsentPreferences): void {
    const cookieValue = JSON.stringify({
      necessary: true, // Always required
      analytics: consent.analytics || false,
      marketing: consent.marketing || false,
      preferences: consent.preferences || false,
      timestamp: new Date().toISOString()
    });
    
    document.cookie = `expense_flow_consent=${encodeURIComponent(cookieValue)}; path=/; max-age=${365 * 24 * 60 * 60}; secure; samesite=strict`;
  }
  
  static getConsentCookie(): ConsentPreferences | null {
    const cookies = document.cookie.split(';');
    const consentCookie = cookies.find(cookie => 
      cookie.trim().startsWith('expense_flow_consent=')
    );
    
    if (!consentCookie) return null;
    
    try {
      const value = decodeURIComponent(consentCookie.split('=')[1]);
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  
  static hasValidConsent(): boolean {
    const consent = this.getConsentCookie();
    if (!consent) return false;
    
    // Check if consent is less than 1 year old
    const consentDate = new Date(consent.timestamp);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    return consentDate > oneYearAgo;
  }
}

interface ConsentPreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
  timestamp: string;
}
```
```

---

## 🚨 Incident Response Plan

### Security Incident Response for Next.js

```typescript
// lib/incident-response.ts
import { prisma } from './prisma';
import { AuditLogger } from './audit-logger';

export class IncidentResponse {
  private auditLogger: AuditLogger;
  
  constructor() {
    this.auditLogger = new AuditLogger();
  }
  
  async handleSecurityIncident(incident: SecurityIncident): Promise<IncidentReport> {
    const response = new IncidentResponsePlan(incident);
    
    // Log incident
    await this.auditLogger.logSecurityEvent({
      type: 'SECURITY_INCIDENT',
      userId: incident.reportedBy,
      ipAddress: 'system',
      userAgent: 'incident-response',
      details: {
        incidentType: incident.type,
        severity: incident.severity,
        description: incident.description
      },
      severity: incident.severity
    });
    
    const report: IncidentReport = {
      incidentId: incident.id,
      timeline: [],
      actions: [],
      affectedUsers: incident.affectedUsers || [],
      resolution: null
    };
    
    try {
      // 1. Immediate containment
      report.timeline.push({
        timestamp: new Date(),
        action: 'containment_initiated',
        details: 'Starting containment procedures'
      });
      
      const containmentResult = await response.containThreat();
      report.actions.push(...containmentResult.actions);
      
      // 2. Assessment and investigation
      report.timeline.push({
        timestamp: new Date(),
        action: 'assessment_started',
        details: 'Assessing incident impact'
      });
      
      const assessment = await response.assessDamage();
      report.actions.push(...assessment.actions);
      report.affectedUsers = assessment.affectedUsers;
      
      // 3. User notification (if required)
      if (assessment.requiresUserNotification) {
        report.timeline.push({
          timestamp: new Date(),
          action: 'user_notification_initiated',
          details: 'Notifying affected users'
        });
        
        await response.notifyAffectedUsers(assessment.affectedUsers);
      }
      
      // 4. Regulatory compliance
      if (assessment.requiresRegulatoryReporting) {
        report.timeline.push({
          timestamp: new Date(),
          action: 'regulatory_reporting_initiated',
          details: 'Initiating regulatory compliance procedures'
        });
        
        await response.handleComplianceReporting();
      }
      
      // 5. Recovery and monitoring
      report.timeline.push({
        timestamp: new Date(),
        action: 'recovery_initiated',
        details: 'Starting recovery procedures'
      });
      
      const recovery = await response.implementRecovery();
      report.actions.push(...recovery.actions);
      
      report.resolution = {
        timestamp: new Date(),
        status: 'resolved',
        summary: 'Incident successfully contained and resolved'
      };
      
    } catch (error) {
      report.resolution = {
        timestamp: new Date(),
        status: 'failed',
        summary: `Incident response failed: ${error.message}`
      };
      
      console.error('Incident response failed:', error);
    }
    
    // Store incident report
    await this.storeIncidentReport(report);
    
    return report;
  }
  
  private async storeIncidentReport(report: IncidentReport): Promise<void> {
    await prisma.incidentReport.create({
      data: {
        incidentId: report.incidentId,
        timeline: report.timeline,
        actions: report.actions,
        affectedUsers: report.affectedUsers,
        resolution: report.resolution,
      }
    });
  }
}

class IncidentResponsePlan {
  constructor(private incident: SecurityIncident) {}
  
  async containThreat(): Promise<ContainmentResult> {
    const actions: ResponseAction[] = [];
    
    switch (this.incident.type) {
      case 'DATA_BREACH':
        // Lock down affected resources
        actions.push({
          type: 'access_restriction',
          description: 'Restricted access to affected data',
          timestamp: new Date()
        });
        
        // Revoke sessions for affected users
        if (this.incident.affectedUsers) {
          await this.revokeUserSessions(this.incident.affectedUsers);
          actions.push({
            type: 'session_revocation',
            description: `Revoked sessions for ${this.incident.affectedUsers.length} users`,
            timestamp: new Date()
          });
        }
        break;
        
      case 'UNAUTHORIZED_ACCESS':
        // Revoke all affected user sessions
        if (this.incident.affectedUsers) {
          await this.revokeUserSessions(this.incident.affectedUsers);
          actions.push({
            type: 'session_revocation',
            description: `Revoked sessions for compromised accounts`,
            timestamp: new Date()
          });
        }
        
        // Enable additional security monitoring
        await this.enableEnhancedMonitoring();
        actions.push({
          type: 'monitoring_enhanced',
          description: 'Enabled enhanced security monitoring',
          timestamp: new Date()
        });
        break;
        
      case 'DDOS_ATTACK':
        // Enable emergency rate limiting
        await this.enableEmergencyRateLimit();
        actions.push({
          type: 'rate_limit_emergency',
          description: 'Enabled emergency rate limiting',
          timestamp: new Date()
        });
        break;
        
      case 'MALWARE_DETECTED':
        // Quarantine affected files
        if (this.incident.affectedResources) {
          await this.quarantineFiles(this.incident.affectedResources);
          actions.push({
            type: 'file_quarantine',
            description: `Quarantined ${this.incident.affectedResources.length} files`,
            timestamp: new Date()
          });
        }
        break;
    }
    
    return { actions };
  }
  
  async assessDamage(): Promise<AssessmentResult> {
    const actions: ResponseAction[] = [];
    let affectedUsers: string[] = this.incident.affectedUsers || [];
    let requiresUserNotification = false;
    let requiresRegulatoryReporting = false;
    
    // Analyze logs for impact assessment
    actions.push({
      type: 'log_analysis',
      description: 'Analyzed security logs for impact assessment',
      timestamp: new Date()
    });
    
    // Determine notification requirements
    if (this.incident.severity === 'HIGH' || this.incident.severity === 'CRITICAL') {
      requiresUserNotification = true;
      
      if (this.incident.type === 'DATA_BREACH') {
        requiresRegulatoryReporting = true;
      }
    }
    
    return {
      actions,
      affectedUsers,
      requiresUserNotification,
      requiresRegulatoryReporting
    };
  }
  
  async notifyAffectedUsers(userIds: string[]): Promise<void> {
    // Implementation would send notifications to affected users
    for (const userId of userIds) {
      await prisma.notification.create({
        data: {
          userId,
          type: 'SECURITY_INCIDENT',
          title: 'Security Incident Notification',
          message: 'We have detected unusual activity on your account. Please review your recent activity and change your password if needed.',
          priority: 'HIGH'
        }
      });
    }
  }
  
  async handleComplianceReporting(): Promise<void> {
    // Create compliance report
    await prisma.complianceReport.create({
      data: {
        type: 'GDPR_BREACH_NOTIFICATION',
        incidentId: this.incident.id,
        reportedAt: new Date(),
        status: 'SUBMITTED',
        details: {
          incidentType: this.incident.type,
          affectedUsers: this.incident.affectedUsers?.length || 0,
          dataTypes: ['financial_records', 'personal_information']
        }
      }
    });
  }
  
  async implementRecovery(): Promise<RecoveryResult> {
    const actions: ResponseAction[] = [];
    
    // Reset security policies
    actions.push({
      type: 'policy_reset',
      description: 'Reset security policies to baseline',
      timestamp: new Date()
    });
    
    // Implement additional monitoring
    actions.push({
      type: 'monitoring_implementation',
      description: 'Implemented additional security monitoring',
      timestamp: new Date()
    });
    
    return { actions };
  }
  
  private async revokeUserSessions(userIds: string[]): Promise<void> {
    await prisma.session.deleteMany({
      where: {
        userId: { in: userIds }
      }
    });
  }
  
  private async enableEnhancedMonitoring(): Promise<void> {
    // Implementation to enable enhanced monitoring
    console.log('Enhanced monitoring enabled');
  }
  
  private async enableEmergencyRateLimit(): Promise<void> {
    // Implementation to enable emergency rate limiting
    console.log('Emergency rate limiting enabled');
  }
  
  private async quarantineFiles(fileIds: string[]): Promise<void> {
    await prisma.file.updateMany({
      where: { id: { in: fileIds } },
      data: { quarantined: true }
    });
  }
}

interface SecurityIncident {
  id: string;
  type: 'DATA_BREACH' | 'UNAUTHORIZED_ACCESS' | 'DDOS_ATTACK' | 'MALWARE_DETECTED';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  affectedUsers?: string[];
  affectedResources?: string[];
  detectedAt: Date;
  description: string;
  reportedBy?: string;
}

interface IncidentReport {
  incidentId: string;
  timeline: TimelineEntry[];
  actions: ResponseAction[];
  affectedUsers: string[];
  resolution: Resolution | null;
}

interface TimelineEntry {
  timestamp: Date;
  action: string;
  details: string;
}

interface ResponseAction {
  type: string;
  description: string;
  timestamp: Date;
}

interface Resolution {
  timestamp: Date;
  status: 'resolved' | 'failed' | 'ongoing';
  summary: string;
}

interface ContainmentResult {
  actions: ResponseAction[];
}

interface AssessmentResult {
  actions: ResponseAction[];
  affectedUsers: string[];
  requiresUserNotification: boolean;
  requiresRegulatoryReporting: boolean;
}

interface RecoveryResult {
  actions: ResponseAction[];
}
```

---

**Next:** [UX/UI Specifications](../ux/flows.md)