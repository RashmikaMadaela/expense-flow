'use client'

import { signIn } from 'next-auth/react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { CreditCard, Users, PieChart, Shield, Sparkles } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-slate-900">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CreditCard className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">ExpenseFlow</span>
          </div>
          <Button 
            onClick={() => signIn('google')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            Sign In with Google
          </Button>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full mb-6">
            <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">New: Custom participant support!</span>
          </div>
          <h1 className="text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6 leading-tight">
            Track Expenses with <span className="text-indigo-600 dark:text-indigo-400">Friends</span>
          </h1>
          <p className="text-xl text-slate-700 dark:text-slate-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            Split bills, track expenses, and settle up with friends easily. 
            No more awkward money conversations or forgotten debts.
          </p>
          <Button 
            onClick={() => signIn('google')}
            size="lg"
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            Get Started Free
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardHeader>
              <CreditCard className="h-12 w-12 text-indigo-600 dark:text-indigo-400 mx-auto mb-4" />
              <CardTitle className="text-slate-900 dark:text-slate-100">Easy Expense Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Add expenses quickly with photos, categories, and automatic splitting
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardHeader>
              <Users className="h-12 w-12 text-emerald-600 dark:text-emerald-400 mx-auto mb-4" />
              <CardTitle className="text-slate-900 dark:text-slate-100">Friend Management</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Add friends and manage shared expenses easily
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardHeader>
              <PieChart className="h-12 w-12 text-purple-600 dark:text-purple-400 mx-auto mb-4" />
              <CardTitle className="text-slate-900 dark:text-slate-100">Smart Splitting</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Split expenses equally or set custom amounts for each person
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardHeader>
              <Shield className="h-12 w-12 text-amber-600 dark:text-amber-400 mx-auto mb-4" />
              <CardTitle className="text-slate-900 dark:text-slate-100">Secure Settlements</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Track payments and settle debts with integrated payment tracking
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl p-12 shadow-xl border border-slate-200 dark:border-slate-700">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            Ready to simplify your expense tracking?
          </h2>
          <p className="text-slate-700 dark:text-slate-300 mb-8 text-lg">
            Join thousands of users who have streamlined their expense sharing
          </p>
          <Button 
            onClick={() => signIn('google')}
            size="lg"
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            Sign Up with Google - It&apos;s Free!
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center">
        <p className="text-slate-600 dark:text-slate-400">&copy; 2025 ExpenseFlow. Built with Next.js and passion.</p>
      </footer>
    </div>
  )
}