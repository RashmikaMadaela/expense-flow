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
  groupId: z.string().cuid('Invalid group ID').optional(),
  participants: z.array(z.object({
    userId: z.string().cuid('Invalid user ID').optional(),
    customName: z.string().min(1, 'Custom name is required').max(100, 'Name too long').optional(),
    amount: z.number().positive('Participant amount must be positive').optional(),
  }).refine(data => data.userId || data.customName, {
    message: 'Either userId or customName must be provided',
  })).optional(), // Made optional for personal expenses
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
    userId: z.string().cuid('Invalid user ID').optional(),
    customName: z.string().min(1, 'Custom name is required').max(100, 'Name too long').optional(),
    amount: z.number().positive('Participant amount must be positive').optional(),
  }).refine(data => data.userId || data.customName, {
    message: 'Either userId or customName must be provided',
  })).optional(),
});

export const GetExpensesSchema = z.object({
  groupId: z.string().cuid('Invalid group ID').optional(),
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
  userId: z.string().cuid('Invalid user ID'),
});

/**
 * Friend-related validation schemas
 */
export const SendFriendRequestSchema = z.object({
  friendId: z.string().cuid('Invalid user ID'),
});

export const RespondFriendRequestSchema = z.object({
  requestId: z.string().cuid('Invalid request ID'),
  accept: z.boolean(),
});

/**
 * Settlement-related validation schemas
 */
export const CreateSettlementSchema = z.object({
  payerId: z.string().cuid('Invalid payer ID'),
  payeeId: z.string().cuid('Invalid payee ID'),
  amount: z.number().positive('Amount must be positive'),
  groupId: z.string().cuid('Invalid group ID').optional(),
  notes: z.string().max(500, 'Notes too long').optional(),
});

export const ConfirmSettlementSchema = z.object({
  settlementId: z.string().cuid('Invalid settlement ID'),
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
  id: z.string().cuid('Invalid ID format'),
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