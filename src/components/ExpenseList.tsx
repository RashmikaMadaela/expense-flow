'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Edit3, Calendar, Tag } from 'lucide-react';

interface Expense {
  id: string;
  description: string;
  amount: number;
  notes?: string;
  category: string;
  createdAt: string;
  creator: {
    name: string;
    email: string;
  };
  participants?: Array<{
    user?: {
      name: string;
      email: string;
    };
    customName?: string;
    share?: number;
  }>;
}

interface ExpenseListProps {
  refreshTrigger?: number;
  onExpenseDeleted?: () => void;
}

export default function ExpenseList({ refreshTrigger, onExpenseDeleted }: ExpenseListProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingExpense, setEditingExpense] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    description: '',
    amount: '',
    category: '',
    notes: ''
  });

  const categories = [
    { value: 'food', label: 'Food & Dining' },
    { value: 'transportation', label: 'Transportation' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'shopping', label: 'Shopping' },
    { value: 'bills', label: 'Bills & Utilities' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'other', label: 'Other' }
  ];

  const startEdit = (expense: Expense) => {
    setEditingExpense(expense.id);
    setEditForm({
      description: expense.description,
      amount: (expense.amount / 100).toString(), // Convert from cents to rupees
      category: expense.category,
      notes: expense.notes || ''
    });
  };

  const cancelEdit = () => {
    setEditingExpense(null);
    setEditForm({
      description: '',
      amount: '',
      category: '',
      notes: ''
    });
  };

  const handleEditSubmit = async (expenseId: string) => {
    try {
      const response = await fetch(`/api/expenses/${expenseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: editForm.description,
          amount: parseFloat(editForm.amount),
          category: editForm.category,
          notes: editForm.notes || undefined,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const updatedExpense = result.data || result;
        
        // Update the expense in local state
        setExpenses(expenses.map(expense => 
          expense.id === expenseId ? {
            ...expense,
            description: updatedExpense.description,
            amount: updatedExpense.amount,
            category: updatedExpense.category,
            notes: updatedExpense.notes
          } : expense
        ));
        
        setEditingExpense(null);
        onExpenseDeleted?.(); // Refresh stats
      } else {
        const errorData = await response.json();
        console.error('Failed to update expense:', errorData);
        alert('Failed to update expense. Please try again.');
      }
    } catch (error) {
      console.error('Error updating expense:', error);
      alert('Error updating expense. Please check your connection.');
    }
  };

  const fetchExpenses = async () => {
    try {
      const response = await fetch('/api/expenses');
      if (response.ok) {
        const result = await response.json();
        const data = result.data || result; // Handle wrapped response
        setExpenses(data.expenses || []);
      } else {
        console.error('Failed to fetch expenses');
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [refreshTrigger]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) {
      return;
    }

    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove from local state immediately for better UX
        setExpenses(expenses.filter(expense => expense.id !== id));
        // Notify parent component to refresh stats
        onExpenseDeleted?.();
      } else {
        const errorData = await response.json();
        console.error('Failed to delete expense:', errorData);
        alert('Failed to delete expense. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Error deleting expense. Please check your connection.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount: number) => {
    // Convert from cents to rupees
    const rupees = amount / 100;
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR'
    }).format(rupees);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      food: 'bg-orange-100 text-orange-800',
      transportation: 'bg-blue-100 text-blue-800',
      entertainment: 'bg-purple-100 text-purple-800',
      shopping: 'bg-pink-100 text-pink-800',
      bills: 'bg-red-100 text-red-800',
      healthcare: 'bg-green-100 text-green-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors.other;
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

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-4 sm:p-6">
            <div className="animate-pulse">
              <div className="flex items-start justify-between space-x-4">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-3"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="text-gray-500">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Tag className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-lg font-medium mb-2">No expenses yet</p>
          <p className="text-sm">Add your first expense to get started tracking your spending!</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {expenses.map((expense) => (
        <Card key={expense.id} className="overflow-hidden hover:shadow-md transition-shadow duration-200">
          {editingExpense === expense.id ? (
            // Edit Form
            <div className="p-4 sm:p-6 bg-gray-50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Edit Expense</h3>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={cancelEdit}
                    className="px-3 py-2"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleEditSubmit(expense.id)}
                    className="px-3 py-2"
                  >
                    Save
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <Input
                      value={editForm.description}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({...editForm, description: e.target.value})}
                      placeholder="Enter expense description"
                      className="w-full"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Amount (LKR)</label>
                    <Input
                      type="number"
                      value={editForm.amount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({...editForm, amount: e.target.value})}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="w-full"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                      value={editForm.category}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditForm({...editForm, category: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {categories.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                    <Input
                      value={editForm.notes}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({...editForm, notes: e.target.value})}
                      placeholder="Add notes..."
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Normal View
            <div className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                    <h3 className="font-semibold text-lg text-gray-900 truncate">{expense.description}</h3>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getCategoryColor(expense.category)} self-start sm:self-auto`}>
                      <Tag className="inline h-3 w-3 mr-1" />
                      {getCategoryLabel(expense.category)}
                    </span>
                  </div>
                  
                  {expense.notes && (
                    <p className="text-gray-600 mb-3 text-sm">{expense.notes}</p>
                  )}
                  
                  {/* Show participants if it's a shared expense */}
                  {expense.participants && expense.participants.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">Shared with:</p>
                      <div className="flex flex-wrap gap-2">
                        {expense.participants.map((participant, index: number) => (
                          <span 
                            key={index}
                            className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs bg-blue-50 text-blue-700 border border-blue-200"
                          >
                            {participant.user ? participant.user.name : participant.customName}
                            {participant.share && (
                              <span className="ml-1 font-medium text-blue-800">
                                ({formatAmount(participant.share)})
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(expense.createdAt)}
                    </span>
                    <span className="hidden sm:block">•</span>
                    <span>by {expense.creator.name}</span>
                  </div>
                </div>
                
                <div className="flex flex-row sm:flex-col items-center sm:items-end gap-3 sm:gap-2">
                  <div className="text-left sm:text-right flex-1 sm:flex-none">
                    <p className="text-2xl sm:text-3xl font-bold text-emerald-600">
                      {formatAmount(expense.amount)}
                    </p>
                  </div>
                  
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(expense)}
                      className="p-2 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors"
                      title="Edit expense"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(expense.id)}
                      className="p-2 hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-colors"
                      title="Delete expense"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}