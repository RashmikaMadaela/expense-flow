import { z } from 'zod';

/**
 * User-related validation schemas
 */
export const UpdateUserProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email format'),
});

export const SearchUsersSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  limit: z.number().int().min(1).max(50).optional().default(20),
});

/**
 * Expense-related validation schemas
 */
export const CreateExpenseSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description is required').max(200, 'Description too long'),
  groupId: z.string().uuid('Invalid group ID').optional(),
  participants: z.array(z.object({
    userId: z.string().uuid('Invalid user ID'),
    amount: z.number().positive('Participant amount must be positive').optional(),
  })).min(1, 'At least one participant is required'),
  splitType: z.enum(['EQUAL', 'EXACT', 'PERCENTAGE']).default('EQUAL'),
  category: z.string().max(50, 'Category too long').optional(),
  notes: z.string().max(500, 'Notes too long').optional(),
});

export const UpdateExpenseSchema = z.object({
  amount: z.number().positive('Amount must be positive').optional(),
  description: z.string().min(1, 'Description is required').max(200, 'Description too long').optional(),
  category: z.string().max(50, 'Category too long').optional(),
  notes: z.string().max(500, 'Notes too long').optional(),
  participants: z.array(z.object({
    userId: z.string().uuid('Invalid user ID'),
    amount: z.number().positive('Participant amount must be positive').optional(),
  })).optional(),
});

export const GetExpensesSchema = z.object({
  groupId: z.string().uuid('Invalid group ID').optional(),
  limit: z.number().int().min(1).max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * Group-related validation schemas
 */
export const CreateGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(100, 'Group name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  members: z.array(z.string().uuid('Invalid user ID')).optional(),
});

export const UpdateGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(100, 'Group name too long').optional(),
  description: z.string().max(500, 'Description too long').optional(),
});

export const AddGroupMemberSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});

/**
 * Friend-related validation schemas
 */
export const SendFriendRequestSchema = z.object({
  friendId: z.string().uuid('Invalid user ID'),
});

export const RespondFriendRequestSchema = z.object({
  requestId: z.string().uuid('Invalid request ID'),
  accept: z.boolean(),
});

/**
 * Settlement-related validation schemas
 */
export const CreateSettlementSchema = z.object({
  payerId: z.string().uuid('Invalid payer ID'),
  payeeId: z.string().uuid('Invalid payee ID'),
  amount: z.number().positive('Amount must be positive'),
  groupId: z.string().uuid('Invalid group ID').optional(),
  notes: z.string().max(500, 'Notes too long').optional(),
});

export const ConfirmSettlementSchema = z.object({
  settlementId: z.string().uuid('Invalid settlement ID'),
  confirmed: z.boolean(),
});

/**
 * Query parameter schemas
 */
export const PaginationSchema = z.object({
  page: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().min(1)).optional(),
  limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().min(1).max(100)).optional(),
});

export const UUIDParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

// Type exports for use in API routes
export type UpdateUserProfile = z.infer<typeof UpdateUserProfileSchema>;
export type SearchUsers = z.infer<typeof SearchUsersSchema>;
export type CreateExpense = z.infer<typeof CreateExpenseSchema>;
export type UpdateExpense = z.infer<typeof UpdateExpenseSchema>;
export type GetExpenses = z.infer<typeof GetExpensesSchema>;
export type CreateGroup = z.infer<typeof CreateGroupSchema>;
export type UpdateGroup = z.infer<typeof UpdateGroupSchema>;
export type AddGroupMember = z.infer<typeof AddGroupMemberSchema>;
export type SendFriendRequest = z.infer<typeof SendFriendRequestSchema>;
export type RespondFriendRequest = z.infer<typeof RespondFriendRequestSchema>;
export type CreateSettlement = z.infer<typeof CreateSettlementSchema>;
export type ConfirmSettlement = z.infer<typeof ConfirmSettlementSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type UUIDParam = z.infer<typeof UUIDParamSchema>;