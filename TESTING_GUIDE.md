# 🧪 API Testing Guide with Thunder Client

## Server Status
- **Development Server**: http://localhost:3001 (Note: Port changed from 3000)
- **Database**: Prisma local database running on port 51213

## Quick Start Testing

### 1. **Test Basic Health Check** ✅
```http
GET http://localhost:3001/api/health
```
Expected Response:
```json
{
  "success": true,
  "message": "Simple API test successful!",
  "timestamp": "2024-12-19T..."
}
```

### 2. **Test Database Connection** ⚠️
```http
GET http://localhost:3001/api/test
```
Expected Response:
```json
{
  "success": true,
  "message": "Database connected successfully!",
  "data": {
    "userCount": 0,
    "timestamp": "2024-12-19T..."
  }
}
```

### 3. **Test User Creation (No Auth Required)** ✅
```http
POST http://localhost:3001/api/test/users
Content-Type: application/json

{
  "name": "Test User",
  "email": "test@example.com"
}
```

### 4. **Test User List (No Auth Required)** ✅
```http
GET http://localhost:3001/api/test/users?limit=5
```

## Thunder Client Setup Instructions

### Import Collection:
1. Open Thunder Client extension in VS Code
2. Go to Collections tab
3. Click "Import" → "Import from File"
4. Select: `thunder-client-collection.json`

### Manual Testing Steps:

#### A. Create Test User First:
```json
POST http://localhost:3001/api/test/users
{
  "name": "John Doe",
  "email": "john@example.com"
}
```

#### B. Get User ID from Response:
```json
{
  "success": true,
  "data": {
    "id": "cm123abc...", 
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

#### C. Test Protected Endpoints (Will Fail Without Auth):
```json
GET http://localhost:3001/api/user/profile
// Expected: 401 Unauthorized
```

## Authentication Flow for Real Testing

Since our APIs require authentication, you'll need to:

### Option 1: Browser Authentication
1. Go to http://localhost:3001 in browser
2. Sign in with Google OAuth
3. Copy session cookie from browser DevTools
4. Add cookie to Thunder Client headers

### Option 2: Create Auth Bypass (Development Only)
I can create test versions of endpoints that skip authentication for easier testing.

## Common Testing Scenarios

### 1. **Full Expense Flow**:
```
1. Create test users
2. Create a group
3. Add users to group  
4. Create expense with participants
5. Check expense details
6. Calculate balances
```

### 2. **Friend System Flow**:
```
1. Create two test users
2. Send friend request
3. Accept friend request
4. List friends
```

### 3. **Group Management Flow**:
```
1. Create group
2. Add members
3. Create group expense
4. Remove member
```

## Response Format
All APIs return this consistent format:
```json
{
  "success": boolean,
  "data": any,
  "message": string,
  "error"?: string
}
```

## Error Codes
- `200` - Success
- `400` - Bad Request / Validation Error
- `401` - Authentication Required
- `403` - Forbidden / Not Authorized
- `404` - Not Found
- `500` - Internal Server Error

## Next Steps
1. Test the health endpoint first
2. Test database connection
3. Create some test users
4. Try protected endpoints (they should fail with 401)
5. Let me know if you want me to create auth bypass versions for testing