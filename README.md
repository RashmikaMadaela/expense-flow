# Expense Flow - Personal Expense & Debt Tracker

**Version:** 2.0  
**Last Updated:** September 17, 2025  
**Status:** In Development

## 🎯 Project Overview

Expense Flow is a modern full-stack web application that simplifies splitting expenses and tracking debts between friends, roommates, and groups. Built with Next.js and PostgreSQL, it offers real-time updates, multiple split methods, and streamlined settlement tracking with type-safe development.

### Key Features

- **Smart Expense Splitting**: Equal, custom amounts, and percentage-based splits
- **Real-time Debt Tracking**: Automatically calculated balances and summaries  
- **Flexible Settlements**: Multiple confirmation modes with payment proof
- **User Management**: Profile management, friend connections, and participant search
- **Audit Trail**: Complete expense and settlement history
- **Multi-Currency Support**: Handle expenses in different currencies
- **Mobile-First Design**: Responsive interface optimized for mobile use

## 🛠 Tech Stack

### Frontend & Backend
- **Next.js 14** - Full-stack React framework with App Router
- **TypeScript** - Type-safe development across frontend and backend
- **Tailwind CSS** - Utility-first styling framework
- **shadcn/ui** - Beautiful and accessible UI components
- **Zustand** - Simple and powerful state management
- **React Hook Form** - Form handling and validation

### Database & ORM
- **PostgreSQL** - Robust relational database (hosted on Neon.tech)
- **Prisma** - Type-safe database ORM with auto-generated types
- **Prisma Migrate** - Database schema versioning and migrations

### Authentication & Security
- **NextAuth.js v5** - Flexible authentication with multiple providers
- **Google OAuth** - Secure sign-in with Google accounts
- **JWT Sessions** - Secure session management
- **Zod** - Runtime type validation and API security

### Development & Deployment
- **Vercel** - Deployment platform for frontend and API routes
- **Jest** - Fast unit testing framework
- **Playwright** - Modern end-to-end testing
- **ESLint + Prettier** - Code linting and formatting
- **Husky** - Git hooks for code quality

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/expense-flow.git
cd expense-flow

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your database and auth configuration

# Set up database
npx prisma migrate dev --name init
npx prisma generate

# Start development server
npm run dev
```

### Environment Variables

```bash
# Database
DATABASE_URL="postgresql://username:password@ep-xxx.us-east-1.neon.tech/neondb?sslmode=require"

# NextAuth.js
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth (optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

## 📁 Project Structure

```
expense-flow/
├── docs/                          # Comprehensive documentation
│   ├── api/                       # API documentation
│   ├── database/                  # Database schema docs
│   ├── business-logic/            # Business rules and flows
│   ├── security/                  # Security specifications
│   └── ux/                        # UX flows and wireframes
├── app/                           # Next.js App Router
│   ├── api/                       # API routes (backend)
│   │   ├── expenses/              # Expense endpoints
│   │   ├── users/                 # User management
│   │   └── auth/                  # Authentication endpoints
│   ├── dashboard/                 # Dashboard pages
│   ├── expenses/                  # Expense management pages
│   ├── globals.css                # Global styles
│   ├── layout.tsx                 # Root layout
│   └── page.tsx                   # Home page
├── components/                    # Reusable UI components
│   ├── ui/                        # shadcn/ui components
│   ├── expense/                   # Expense-related components
│   └── layout/                    # Layout components
├── lib/                           # Utility libraries
│   ├── prisma.ts                  # Prisma client
│   ├── auth.ts                    # NextAuth configuration
│   ├── validations.ts             # Zod schemas
│   └── utils.ts                   # Helper functions
├── prisma/                        # Database configuration
│   ├── schema.prisma              # Database schema
│   └── migrations/                # Database migrations
├── types/                         # TypeScript type definitions
└── tests/                         # Test files
```

## 📚 Documentation

- **[Database Schema](./docs/database/schema.md)** - Complete data model and relationships
- **[API Documentation](./docs/api/endpoints.md)** - All endpoints with examples
- **[Business Logic](./docs/business-logic/rules.md)** - Splitting algorithms and settlement flows
- **[Security Guide](./docs/security/overview.md)** - Authentication, authorization, and data protection
- **[UX Specifications](./docs/ux/flows.md)** - User journeys and interface requirements
- **[Development Guide](./docs/development/setup.md)** - Setup, testing, and deployment

## 🔧 Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server

# Database
npx prisma generate      # Generate Prisma client
npx prisma migrate dev   # Run database migrations
npx prisma studio        # Open Prisma Studio (database GUI)
npx prisma db push       # Push schema changes to database

# Testing
npm run test             # Run unit tests with Vitest
npm run test:e2e         # Run end-to-end tests with Playwright
npm run test:coverage    # Generate test coverage report

# Code Quality
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
npm run type-check       # Run TypeScript checks

# Deployment
npm run deploy           # Deploy to Vercel
```

## 🏗 Development Workflow

1. **Feature Development**
   - Create feature branch from `main`
   - Follow conventional commit messages
   - Write tests for new functionality
   - Update documentation as needed

2. **Code Quality**
   - All commits must pass linting and tests
   - Minimum 80% test coverage for new code
   - Type safety enforced with TypeScript

3. **Deployment**
   - Automatic deployment to staging on `develop` branch
   - Manual deployment to production from `main` branch
   - Database migrations handled via Prisma Migrate

## 🎯 MVP Roadmap

### Phase 1: Core Functionality (4-6 weeks)
- [ ] User authentication and profile management
- [ ] Basic expense creation and equal splitting
- [ ] Email-based participant addition
- [ ] Simple settlement tracking with auto-confirm
- [ ] Dashboard with debt summaries

### Phase 2: Enhanced Features (3-4 weeks)
- [ ] Custom amounts and percentage splits
- [ ] Friend system and participant search
- [ ] Receipt photo uploads
- [ ] Settlement confirmation modes
- [ ] Expense editing and audit trail

### Phase 3: Advanced Features (4-5 weeks)
- [ ] Group management
- [ ] Multi-currency support
- [ ] Reporting and analytics
- [ ] Payment integration (Venmo, PayPal)
- [ ] Mobile app (React Native)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the `/docs` folder for detailed guides
- **Issues**: Report bugs and request features on GitHub Issues
- **Discussions**: Join community discussions on GitHub Discussions

---

**Built with ❤️ for splitting expenses and settling debts seamlessly.**