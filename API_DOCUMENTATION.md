# Expense Flow API Documentation

## Overview
The Expense Flow backend provides a comprehensive REST API for managing expenses, groups, friends, and settlements. All endpoints require authentication except the auth endpoints.

## Authentication
- **Base Auth**: `/api/auth/[...nextauth]` - NextAuth.js handlers for Google OAuth
- **Protection**: All other endpoints require valid session

## API Endpoints

### User Management
- `GET /api/user/profile` - Get current user profile with stats
- `GET /api/user/search?query={search}&limit={n}` - Search users by name/email

### Expense Management
- `POST /api/expenses` - Create new expense with participants
- `GET /api/expenses?groupId={id}&limit={n}&offset={n}&startDate={date}&endDate={date}` - List user's expenses
- `GET /api/expenses/{id}` - Get specific expense with full details
- `PUT /api/expenses/{id}` - Update expense (creator only)
- `DELETE /api/expenses/{id}` - Soft delete expense (creator only)

### Group Management
- `POST /api/groups` - Create new group with optional initial members
- `GET /api/groups?limit={n}&offset={n}` - List user's groups
- `GET /api/groups/{id}` - Get group details with members and recent expenses
- `PUT /api/groups/{id}` - Update group info (admin only)
- `DELETE /api/groups/{id}` - Delete group if no expenses (admin only)
- `POST /api/groups/{id}/members` - Add member to group (admin only)
- `DELETE /api/groups/{id}/members/{userId}` - Remove member (admin or self-removal)

### Friend Management
- `POST /api/friends/requests` - Send friend request
- `GET /api/friends/requests?type={sent|received}&status={PENDING|ACCEPTED|REJECTED}` - List friend requests
- `PUT /api/friends/requests/{id}` - Accept/reject friend request (receiver only)
- `GET /api/friends` - List accepted friends

### Settlements & Balances
- `GET /api/balances?groupId={id}` - Calculate balances between users
- `POST /api/settlements` - Record a settlement/payment (not implemented due to schema issues)
- `GET /api/settlements?status={status}&limit={n}&offset={n}` - List user's settlements

## Request/Response Format

### Standard Response Structure
```json
{
  "success": boolean,
  "data": any,
  "message": string,
  "error"?: string
}
```

### Error Responses
- `400` - Validation error or bad request
- `401` - Authentication required
- `403` - Not authorized for this action
- `404` - Resource not found
- `405` - Method not allowed
- `500` - Internal server error

## Key Features Implemented

### Authentication & Authorization
- ✅ Session-based authentication with NextAuth.js
- ✅ Protected route middleware
- ✅ Role-based access (group admins, expense creators)

### Data Validation
- ✅ Zod schemas for all request bodies
- ✅ Input sanitization and type checking
- ✅ Comprehensive error messages

### Business Logic
- ✅ Equal split calculation for expenses
- ✅ Participant management with share tracking
- ✅ Group membership control
- ✅ Friend request workflow
- ✅ Balance calculation between users

### Data Relationships
- ✅ User → Expenses (created/participated)
- ✅ User → Groups (membership with roles)
- ✅ User → Friends (bidirectional relationships)
- ✅ Groups → Expenses (group-based expense tracking)
- ✅ Expenses → Participants (with individual shares)

### Security Features
- ✅ User can only access their own data
- ✅ Expense creators control their expenses
- ✅ Group admins control group membership
- ✅ Soft deletes for data integrity
- ✅ Validation of user relationships before operations

## Example Usage

### Create an Expense
```bash
POST /api/expenses
{
  "amount": 100.00,
  "description": "Dinner at restaurant",
  "category": "Food",
  "participants": [
    { "userId": "user1" },
    { "userId": "user2" }
  ],
  "splitType": "EQUAL",
  "groupId": "group123"
}
```

### Get Balances
```bash
GET /api/balances?groupId=group123
# Returns who owes what to whom
```

### Send Friend Request
```bash
POST /api/friends/requests
{
  "friendId": "user456"
}
```

## Notes
- All monetary amounts are stored in cents internally
- Dates use ISO 8601 format
- UUIDs used for all entity IDs
- Pagination available on list endpoints
- Soft delete implemented for expenses
- Group admins automatically assigned to group creator