# 🔐 Google OAuth Setup Guide

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name: "Expense Flow" 
4. Click "Create"

## Step 2: Enable Google+ API

1. In your project, go to "APIs & Services" → "Library"
2. Search for "Google+ API" 
3. Click on it and press "Enable"

## Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. If prompted, configure OAuth consent screen first:
   - User Type: External (for testing)
   - App name: "Expense Flow"
   - User support email: Your email
   - Developer email: Your email
   - Save and continue through all steps

4. Create OAuth 2.0 Client ID:
   - Application type: "Web application"
   - Name: "Expense Flow Web Client"
   - Authorized redirect URIs: 
     - `http://localhost:3000/api/auth/callback/google`
     - `http://localhost:3001/api/auth/callback/google` (for current port)
   - Click "Create"

## Step 4: Get Your Credentials

After creating, you'll see a modal with:
- **Client ID**: Something like `123456789-abcdef.apps.googleusercontent.com`
- **Client Secret**: Something like `GOCSPX-abcdef123456`

## Step 5: Update Environment Variables

Replace the values in your `.env.local` file:

```bash
# NextAuth.js
NEXTAUTH_SECRET="your-super-secret-32-char-minimum-key"
NEXTAUTH_URL="http://localhost:3001"  # Updated port

# Google OAuth - REPLACE THESE WITH YOUR ACTUAL VALUES
GOOGLE_CLIENT_ID="123456789-abcdef.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-abcdef123456"

# Development
NODE_ENV="development"
```

## Step 6: Generate NextAuth Secret

Run this command to generate a secure secret:
```bash
npx auth secret
```

Or generate manually:
```bash
openssl rand -base64 32
```

## Step 7: Test Authentication

1. Restart your dev server: `npm run dev`
2. Go to: `http://localhost:3001/api/auth/signin`
3. You should see Google sign-in option
4. After signing in, you should be redirected back

## For Testing APIs Without OAuth (Alternative)

If you want to test APIs immediately without setting up OAuth, I can create development versions that bypass authentication. Just let me know!

## Troubleshooting

### Common Issues:
1. **Redirect URI mismatch**: Make sure you added both localhost:3000 and localhost:3001
2. **Missing scopes**: The consent screen needs basic info scope
3. **App not verified**: For testing, you can continue with unverified app

### Testing OAuth Flow:
```
1. Visit: http://localhost:3001/api/auth/signin
2. Click "Sign in with Google"
3. Complete OAuth flow
4. Check: http://localhost:3001/api/auth/session (should show user data)
```

## What Happens After OAuth Setup:

Once configured, your protected API endpoints will work:
- `GET /api/user/profile` - Returns authenticated user
- `POST /api/expenses` - Create expenses as authenticated user  
- All other protected endpoints will work

Would you like me to:
1. Help you through the Google Cloud setup?
2. Create auth-bypass versions for immediate testing?
3. Both?