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
        console.log('Stats API response:', result); // Debug log
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {session.user?.name?.split(' ')[0]}!
            </h1>
            <p className="text-gray-600 mt-1">
              Track your expenses and manage your finances
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => signOut()}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatAmount(stats.totalExpenses)}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatAmount(stats.monthlyExpenses)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Count</p>
                <p className="text-3xl font-bold text-gray-900">{stats.expenseCount}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Receipt className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Shared Groups</p>
                <p className="text-3xl font-bold text-gray-900">0</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Add Expense Section */}
        <div className="mb-8">
          <AddExpense onExpenseAdded={handleExpenseAdded} />
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-6">Your Expenses</h2>
              <ExpenseList 
                refreshTrigger={refreshTrigger} 
                onExpenseDeleted={handleExpenseAdded}
              />
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Categories</h2>
              <div className="space-y-3">
                {stats.categories && Object.entries(stats.categories).length > 0 ? (
                  Object.entries(stats.categories)
                    .sort(([,a], [,b]) => b - a)
                    .map(([category, amount]) => (
                      <div key={category} className="flex justify-between items-center">
                        <span className="text-sm">{getCategoryLabel(category)}</span>
                        <span className="text-sm font-semibold">{formatAmount(amount)}</span>
                      </div>
                    ))
                ) : (
                  <p className="text-sm text-gray-500">No categories yet</p>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  size="lg"
                  onClick={() => setCurrentView('groups')}
                >
                  <Users className="h-5 w-5 mr-3" />
                  Create Group
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  size="lg"
                  onClick={() => setCurrentView('reports')}
                >
                  <Receipt className="h-5 w-5 mr-3" />
                  View Reports
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}