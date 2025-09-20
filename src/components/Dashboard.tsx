'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Receipt, TrendingUp, LogOut, DollarSign } from 'lucide-react';
import { signOut } from 'next-auth/react';
import AddExpense from '@/components/AddExpense';
import ExpenseList from '@/components/ExpenseList';
import Reports from '@/components/Reports';

interface DashboardStats {
  totalExpenses: number;
  monthlyExpenses: number;
  expenseCount: number;
  categories: { [key: string]: number } | null;
}

export default function Dashboard() {
  const { data: session } = useSession();
  const [currentView, setCurrentView] = useState<'dashboard' | 'reports' | 'groups'>('dashboard');
  const [stats, setStats] = useState<DashboardStats>({
    totalExpenses: 0,
    monthlyExpenses: 0,
    expenseCount: 0,
    categories: {}
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/expenses/stats');
      if (response.ok) {
        const result = await response.json();
        const data = result.data || result; // Handle both wrapped and unwrapped responses
        setStats({
          totalExpenses: data.totalExpenses || 0,
          monthlyExpenses: data.monthlyExpenses || 0,
          expenseCount: data.expenseCount || 0,
          categories: data.categories || {}
        });
      } else {
        console.error('Stats API error:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    if (session) {
      fetchStats();
    }
  }, [session, refreshTrigger]);

  const handleExpenseAdded = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const formatAmount = (amount: number | null | undefined) => {
    const value = amount || 0;
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR'
    }).format(value);
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      food: 'Food & Dining',
      transportation: 'Transportation',
      entertainment: 'Entertainment',
      shopping: 'Shopping',
      bills: 'Bills & Utilities',
      healthcare: 'Healthcare',
      other: 'Other'
    };
    return labels[category] || 'Other';
  };

  if (!session) {
    return null;
  }

  // Show different views based on currentView state
  if (currentView === 'reports') {
    return <Reports onClose={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'groups') {
    // TODO: Implement Groups component
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="outline" onClick={() => setCurrentView('dashboard')}>
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Groups</h1>
          </div>
          <Card className="p-8 text-center">
            <p className="text-lg text-gray-600">Groups functionality coming soon!</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Welcome back, {session.user?.name?.split(' ')[0]}!
            </h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              Track your expenses and manage your finances
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => signOut()}
            className="flex items-center gap-2 self-start sm:self-auto"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className="p-4 sm:p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-600 truncate">Total Expenses</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
                  {formatAmount(stats.totalExpenses)}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full flex-shrink-0 ml-4">
                <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-600 truncate">This Month</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
                  {formatAmount(stats.monthlyExpenses)}
                </p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-full flex-shrink-0 ml-4">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-600 truncate">Total Count</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{stats.expenseCount}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full flex-shrink-0 ml-4">
                <Receipt className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-600 truncate">Shared Groups</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">0</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full flex-shrink-0 ml-4">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Add Expense Section */}
        <div className="mb-6 sm:mb-8">
          <AddExpense onExpenseAdded={handleExpenseAdded} />
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Card className="p-4 sm:p-6 shadow-md">
              <h2 className="text-xl font-semibold mb-4 sm:mb-6">Your Expenses</h2>
              <ExpenseList 
                refreshTrigger={refreshTrigger} 
                onExpenseDeleted={handleExpenseAdded}
              />
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-4 sm:p-6 shadow-md">
              <h2 className="text-xl font-semibold mb-4">Categories</h2>
              <div className="space-y-3">
                {stats.categories && Object.entries(stats.categories).length > 0 ? (
                  Object.entries(stats.categories)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5) // Show top 5 categories
                    .map(([category, amount]) => (
                      <div key={category} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-md transition-colors">
                        <span className="text-sm font-medium text-gray-700">{getCategoryLabel(category)}</span>
                        <span className="text-sm font-semibold text-gray-900">{formatAmount(amount)}</span>
                      </div>
                    ))
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                      <Receipt className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500">No categories yet</p>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-4 sm:p-6 shadow-md">
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors" 
                  size="lg"
                  onClick={() => setCurrentView('groups')}
                >
                  <Users className="h-5 w-5 mr-3" />
                  Create Group
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700 transition-colors" 
                  size="lg"
                  onClick={() => setCurrentView('reports')}
                >
                  <Receipt className="h-5 w-5 mr-3" />
                  View Reports
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-colors" 
                  size="lg"
                  onClick={() => {
                    // Scroll to expense list where settlements are accessible
                    const expenseSection = document.querySelector('.lg\\:col-span-3');
                    expenseSection?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <DollarSign className="h-5 w-5 mr-3" />
                  View Settlements
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}