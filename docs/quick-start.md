# 🚀 Quick Start Guide

Get Expense Flow running locally in under 10 minutes!

## Prerequisites

Before starting, ensure you have:

- **Node.js 18+**: [Download from nodejs.org](https://nodejs.org/)
- **Git**: [Download from git-scm.com](https://git-scm.com/)
- **PostgreSQL**: [Download from postgresql.org](https://postgresql.org/) or use Docker
- **Google OAuth Credentials**: [Google Cloud Console](https://console.cloud.google.com/)

## 1. Clone the Repository

```bash
git clone https://github.com/yourusername/expense-flow.git
cd expense-flow
```

## 2. Install Dependencies

```bash
npm install
```

## 3. Set Up PostgreSQL Database

### Option A: Using Docker (Recommended)

```bash
# Start PostgreSQL container
docker run --name expense-flow-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=expenseflow \
  -p 5432:5432 \
  -d postgres:15

# Verify container is running
docker ps
```

### Option B: Local PostgreSQL Installation

```bash
# Create database
createdb expenseflow

# Or using psql
psql -U postgres
CREATE DATABASE expenseflow;
\q
```

## 4. Configure Environment Variables

Create `.env.local` file in the project root:

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/expenseflow"

# NextAuth.js
NEXTAUTH_SECRET="your-super-secret-32-char-minimum-key"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth (required)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### Getting Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Google+ API"
4. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
5. Set application type to "Web application"
6. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
7. Copy Client ID and Client Secret to `.env.local`

## 5. Initialize Database

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Seed with sample data (optional)
npx prisma db seed
```

## 6. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser! 🎉

## 7. Create Your First Group

1. **Sign In**: Click "Sign In with Google"
2. **Create Group**: Click "Create Group"
   - Name: "Weekend Trip"
   - Description: "Our amazing getaway"
3. **Add Members**: Invite friends by email
4. **Add Expense**: Create your first expense
   - Description: "Dinner"
   - Amount: $50.00
   - Split equally

## Quick Commands Reference

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build for production
npm run start           # Start production server

# Database
npx prisma studio       # Open database browser
npx prisma migrate dev  # Create new migration
npx prisma db seed      # Seed sample data
npx prisma db reset     # Reset database

# Testing
npm run test           # Run unit tests
npm run test:e2e       # Run E2E tests
npm run lint           # Run linting
npm run type-check     # Type checking
```

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker ps  # For Docker users
# or
pg_isready -h localhost -p 5432  # For local installation

# Verify database exists
psql -U postgres -l | grep expenseflow
```

### Google OAuth Issues

- Verify redirect URI: `http://localhost:3000/api/auth/callback/google`
- Check Client ID/Secret in `.env.local`
- Ensure Google+ API is enabled

### Build Errors

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Regenerate Prisma client
npx prisma generate
```

### Port Already in Use

```bash
# Kill process on port 3000
npx kill-port 3000

# Or use different port
npm run dev -- -p 3001
```

## Next Steps

Once you have the app running:

1. **Explore Features**: Create groups, add expenses, settle up
2. **Read Documentation**: Check `docs/` folder for detailed guides
3. **Customize**: Modify components in `src/app/` and `src/components/`
4. **Deploy**: Follow the [deployment guide](./development/setup.md#deployment)

## Project Structure Overview

```
expense-flow/
├── src/
│   ├── app/                # Next.js 14 App Router
│   │   ├── api/           # API routes
│   │   ├── (auth)/        # Authentication pages
│   │   ├── dashboard/     # Main app pages
│   │   └── globals.css    # Global styles
│   ├── components/        # React components
│   │   ├── ui/           # Base UI components
│   │   ├── forms/        # Form components
│   │   └── layout/       # Layout components
│   ├── lib/              # Utilities
│   │   ├── auth.ts       # NextAuth configuration
│   │   ├── prisma.ts     # Database client
│   │   └── utils.ts      # Helper functions
│   └── types/            # TypeScript definitions
├── prisma/
│   ├── schema.prisma     # Database schema
│   ├── migrations/       # Migration files
│   └── seed.ts          # Seed data
├── docs/                # Documentation
└── tests/               # Test files
```

## Need Help?

- 📖 **Documentation**: Check the `docs/` folder
- 🐛 **Issues**: Report bugs on GitHub Issues
- 💬 **Discussions**: Join GitHub Discussions
- 📧 **Contact**: Email [your-email@example.com](mailto:your-email@example.com)

---

**You're all set!** Start building amazing expense tracking features! 🎯