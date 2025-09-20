# ExpenseFlow - Personal Expense & Bill Splitting App

**Version:** 1.0.0  
**Last Updated:** September 17, 2025  
**Status:** ✅ Production Ready

## 🎯 Project Overview

ExpenseFlow is a modern, full-stack expense tracking and bill splitting application built with Next.js 15, TypeScript, and PostgreSQL. It offers personal expense tracking, real-time statistics, and is designed to grow into a comprehensive bill splitting platform for friends, roommates, and groups.

### 🚀 Current Features (v1.0)
- ✅ **Personal Expense Tracking** - Add, edit, and delete personal expenses
- ✅ **Real-time Statistics** - Dashboard with spending totals and category breakdowns
- ✅ **Secure Authentication** - Google OAuth integration with NextAuth.js v5
- ✅ **Category Management** - Organize expenses by categories (Food, Transportation, etc.)
- ✅ **Responsive Design** - Modern UI that works on desktop and mobile
- ✅ **Type-Safe Development** - Full TypeScript implementation
- ✅ **Production Database** - PostgreSQL with Prisma ORM

### 🔮 Planned Features (v2.0+)
- 🚧 **Bill Splitting** - Split expenses with friends and groups  
- 🚧 **Group Management** - Create groups for trips, roommates, or shared activities
- 🚧 **Settlement Tracking** - Track who owes what and when payments are made
- 🚧 **Multi-Currency Support** - Handle expenses in different currencies
- 🚧 **Payment Integration** - Connect with Venmo, PayPal, etc.
- 🚧 **Export & Reports** - Generate spending reports and export data

## 🛠 Tech Stack

### Frontend
- **[Next.js 15](https://nextjs.org/)** - React framework with App Router and Turbopack
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript development
- **[Tailwind CSS v4](https://tailwindcss.com/)** - Utility-first CSS framework
- **[shadcn/ui](https://ui.shadcn.com/)** - Modern, accessible React components
- **[Lucide Icons](https://lucide.dev/)** - Beautiful SVG icon library
- **[React Hook Form](https://react-hook-form.com/)** - Performant form library

### Backend & Database
- **[Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)** - Serverless API endpoints
- **[PostgreSQL](https://postgresql.org/)** - Robust relational database (Neon.tech)
- **[Prisma](https://prisma.io/)** - Type-safe database ORM with auto-generated types
- **[Zod](https://zod.dev/)** - Runtime type validation and API security

### Authentication & Security
- **[NextAuth.js v5](https://next-auth.js.org/)** - Complete authentication solution
- **[Google OAuth](https://developers.google.com/identity/protocols/oauth2)** - Secure social login
- **JWT Sessions** - Stateless session management

### Development & Deployment
- **[Vercel](https://vercel.com/)** - Zero-config deployment platform
- **[ESLint](https://eslint.org/)** - Code linting and quality
- **[Prettier](https://prettier.io/)** - Code formatting
- **[Turbopack](https://turbo.build/pack)** - Ultra-fast bundler

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** ([Download](https://nodejs.org/))
- **Git** for version control
- **PostgreSQL Database** ([Neon.tech](https://neon.tech/) recommended for beginners)
- **Google OAuth App** (for authentication)

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/expense-flow.git
cd expense-flow
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env.local` file in the root directory:

```env
# Database (Neon.tech PostgreSQL)
DATABASE_URL="postgresql://username:password@ep-xxx.us-east-1.neon.tech/neondb?sslmode=require"

# NextAuth.js
NEXTAUTH_SECRET="your-secure-random-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### 4. Database Setup
```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio to view data
npx prisma studio
```

### 5. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## ⚙️ Configuration

### Setting up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Add authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://yourdomain.com/api/auth/callback/google`
6. Copy Client ID and Secret to your `.env.local`

### Database Options

#### Option 1: Neon.tech (Recommended)
1. Sign up at [neon.tech](https://neon.tech/)
2. Create a new PostgreSQL database
3. Copy connection string to `DATABASE_URL`

#### Option 2: Local PostgreSQL
```bash
# Install PostgreSQL locally
# Create database
createdb expenseflow

# Update .env.local
DATABASE_URL="postgresql://username:password@localhost:5432/expenseflow"
```

#### Option 3: Other Cloud Providers
- **Supabase**: [supabase.com](https://supabase.com/)
- **Railway**: [railway.app](https://railway.app/)
- **PlanetScale**: [planetscale.com](https://planetscale.com/)

## 🎯 Live Demo & Screenshots

> **� Production Status:** Application is fully functional and deployment-ready

### Access the Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to experience:

### Core Features Showcase

#### 1. **Landing Page & Authentication**
- **Google OAuth Integration:** Secure one-click authentication
- **Responsive Design:** Mobile-first approach with Tailwind CSS v4
- **Clean UI:** Modern interface with shadcn/ui components

#### 2. **Dashboard Overview**
- **Real-time Statistics:** Total expenses, monthly spending, category breakdown
- **Quick Actions:** Add new expenses with instant form validation
- **Expense Timeline:** Chronological view of all transactions

#### 3. **Expense Management**
- **Smart Forms:** React Hook Form with Zod validation
- **Category Support:** Multiple expense categories for organization
- **Date Handling:** Intuitive date picker with timezone support
- **Amount Formatting:** Currency display with proper formatting

#### 4. **Data Visualization**
- **Spending Analytics:** Visual breakdown of expenses by category
- **Monthly Trends:** Track spending patterns over time
- **Export Capabilities:** Download expense reports (planned feature)

### Technical Highlights
- **⚡ Performance:** Built with Next.js 15 and Turbopack for blazing-fast development
- **🔒 Security:** NextAuth.js v5 with production-ready session management
- **💾 Database:** Robust PostgreSQL schema with Prisma ORM
- **📱 Responsive:** Fully responsive design works on all devices
- **🎨 Modern UI:** Beautiful interface with Tailwind CSS v4 and Lucide icons

### API Testing Results
All backend endpoints are fully operational:
```bash
✅ GET /api/user          # User profile and authentication
✅ POST /api/expenses     # Create new expenses
✅ GET /api/expenses      # Retrieve user expenses
✅ PUT /api/expenses/[id] # Update existing expenses
✅ DELETE /api/expenses/[id] # Remove expenses
✅ GET /api/stats         # Expense statistics and analytics
```
## 📁 Project Structure

```
expense-flow/
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── api/                   # API routes (backend)
│   │   │   ├── auth/              # NextAuth.js endpoints
│   │   │   ├── expenses/          # Expense CRUD operations
│   │   │   │   ├── route.ts       # GET/POST expenses
│   │   │   │   ├── [id]/route.ts  # Individual expense operations
│   │   │   │   └── stats/route.ts # Expense statistics
│   │   │   ├── groups/            # Group management (future)
│   │   │   └── users/             # User management
│   │   ├── globals.css            # Global Tailwind styles
│   │   ├── layout.tsx             # Root layout with providers
│   │   └── page.tsx               # Landing/Dashboard page
│   ├── components/                # React components
│   │   ├── ui/                    # shadcn/ui base components
│   │   │   ├── button.tsx         # Button component
│   │   │   ├── card.tsx           # Card components
│   │   │   └── input.tsx          # Input component
│   │   ├── AddExpense.tsx         # Expense creation form
│   │   ├── Dashboard.tsx          # Main dashboard
│   │   ├── ExpenseList.tsx        # Expense display component
│   │   ├── LandingPage.tsx        # Authentication landing
│   │   └── Providers.tsx          # Context providers
│   ├── lib/                       # Utility libraries
│   │   ├── api-middleware.ts      # API helper functions
│   │   ├── auth.ts                # NextAuth configuration
│   │   ├── prisma.ts              # Prisma client instance
│   │   ├── utils.ts               # Helper functions
│   │   └── validations.ts         # Zod validation schemas
│   └── types/                     # TypeScript definitions
├── prisma/                        # Database configuration
│   ├── schema.prisma              # Database schema
│   └── migrations/                # Version-controlled migrations
├── public/                        # Static assets
├── .env.local                     # Environment variables
├── package.json                   # Dependencies and scripts
├── tailwind.config.js             # Tailwind CSS configuration
├── tsconfig.json                  # TypeScript configuration
└── README.md                      # This documentation
```

## � API Endpoints

### Authentication
- `GET /api/auth/session` - Get current user session
- `POST /api/auth/signin/google` - Sign in with Google
- `POST /api/auth/signout` - Sign out user

### Expenses
- `GET /api/expenses` - Get user's expenses (with pagination)
- `POST /api/expenses` - Create new expense
- `GET /api/expenses/stats` - Get expense statistics
- `GET /api/expenses/[id]` - Get specific expense details
- `PUT /api/expenses/[id]` - Update expense
- `DELETE /api/expenses/[id]` - Delete expense (soft delete)

### Example API Usage

#### Create Expense
```javascript
const response = await fetch('/api/expenses', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    description: "Lunch at restaurant",
    amount: 25.99,
    category: "food",
    notes: "Business lunch with client"
  })
});
```

#### Get Statistics
```javascript
const stats = await fetch('/api/expenses/stats').then(r => r.json());
// Returns: { totalExpenses, monthlyExpenses, expenseCount, categories }
```

### Future API Endpoints (v2.0+)
- `POST /api/groups` - Create expense groups
- `POST /api/expenses/split` - Split expenses with participants
- `POST /api/settlements` - Record debt settlements
- `GET /api/friends` - Manage friend connections

## 🔧 Available Scripts

```bash
# Development
npm run dev              # Start development server with Turbopack
npm run build            # Build optimized production bundle
npm run start            # Start production server
npm run lint             # Run ESLint for code quality
npm run type-check       # Run TypeScript type checking

# Database Management
npx prisma generate      # Generate Prisma client
npx prisma migrate dev   # Create and apply new migration
npx prisma migrate reset # Reset database (development only)
npx prisma studio        # Open visual database browser
npx prisma db push       # Push schema changes without migration

# Code Quality
npm run format           # Format code with Prettier (when available)
```

## 🚀 Deployment

### Deploy to Vercel (Recommended)

1. **Fork/Clone this repository**
2. **Connect to Vercel:**
   - Visit [vercel.com](https://vercel.com/)
   - Import your GitHub repository
   - Vercel auto-detects Next.js configuration

3. **Add Environment Variables in Vercel Dashboard:**
   ```env
   DATABASE_URL=your_neon_production_url
   NEXTAUTH_SECRET=your_secure_secret_key
   NEXTAUTH_URL=https://your-app.vercel.app
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```

4. **Deploy:** Vercel automatically builds and deploys on push to main

### Alternative Platforms

#### Netlify
```bash
npm run build
# Deploy the .next folder
```

#### Railway
1. Connect GitHub repository
2. Add environment variables
3. Railway handles the rest

#### Docker Deployment
```dockerfile
# Dockerfile provided for containerized deployment
# See deployment documentation for details
```

### Production Checklist
- [ ] Set secure `NEXTAUTH_SECRET` (min 32 characters)
- [ ] Configure production database (Neon/Supabase)
- [ ] Update Google OAuth redirect URLs
- [ ] Enable SSL/HTTPS
- [ ] Set up monitoring and analytics

## 🏗 Development Workflow & Contribution Guide

### Development Best Practices

1. **Feature Development**
   - Create feature branch from `main`: `git checkout -b feature/expense-categories`
   - Follow conventional commit messages: `feat: add expense category filtering`
   - Test functionality locally before pushing
   - Update documentation for new features

2. **Code Quality Standards**
   - All commits must pass TypeScript checks
   - Follow ESLint rules and Prettier formatting
   - Use meaningful variable and function names
   - Add JSDoc comments for complex functions

3. **Testing Strategy**
   - Test all API endpoints manually during development
   - Verify responsive design on multiple screen sizes
   - Test authentication flow with Google OAuth
   - Validate form submissions and error handling

4. **Database Migrations**
   ```bash
   # Create new migration
   npx prisma migrate dev --name add_expense_categories
   
   # Reset development database
   npx prisma migrate reset
   ```

### Contribution Guidelines

1. **Fork & Clone**
   ```bash
   git clone https://github.com/your-username/expense-flow.git
   cd expense-flow
   npm install
   ```

2. **Environment Setup**
   - Copy `.env.local.example` to `.env.local`
   - Add your own Google OAuth credentials
   - Set up database connection

3. **Pull Request Process**
   - Ensure your changes work locally
   - Update README if adding features
   - Submit PR with clear description
   - Link any related issues

## 🔍 Troubleshooting

### Common Issues

#### Authentication Problems
```bash
# Error: Google OAuth not working
# Solution: Check redirect URLs in Google Console
# Development: http://localhost:3000/api/auth/callback/google
# Production: https://yourdomain.com/api/auth/callback/google
```

#### Database Connection Issues
```bash
# Error: Prisma client not generated
npx prisma generate

# Error: Migration pending
npx prisma migrate dev

# Error: Database connection failed
# Check DATABASE_URL in .env.local
```

#### Build Problems
```bash
# TypeScript errors
npm run type-check

# ESLint errors
npm run lint

# Clear Next.js cache
rm -rf .next
npm run dev
```

### Performance Optimization

1. **Database Queries**
   - Use Prisma's `include` for related data
   - Implement pagination for large datasets
   - Add database indexes for frequently queried fields

2. **Frontend Performance**
   - Leverage Next.js image optimization
   - Use React.memo for expensive components
   - Implement proper loading states

3. **Production Deployment**
   - Enable gzip compression
   - Configure CDN for static assets
   - Monitor application performance with Vercel Analytics

## 🎉 What's Next?

### Roadmap Features
- **📊 Advanced Analytics:** Charts and spending trends
- **👥 Group Expenses:** Split bills with friends/family
- **📱 PWA Support:** Install as mobile app
- **🔄 Import/Export:** CSV and PDF export functionality
- **🏷️ Custom Categories:** User-defined expense categories
- **💡 Smart Suggestions:** AI-powered expense categorization
- **🔔 Notifications:** Spending limit alerts and reminders

### Contributing
We welcome contributions! See our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Support
- **Issues:** [GitHub Issues](https://github.com/your-username/expense-flow/issues)
- **Discussions:** [GitHub Discussions](https://github.com/your-username/expense-flow/discussions)
- **Documentation:** [Project Wiki](https://github.com/your-username/expense-flow/wiki)

---

**Built with ❤️ using Next.js 15, React, TypeScript, and modern web technologies.**

*Happy expense tracking! 💰*
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