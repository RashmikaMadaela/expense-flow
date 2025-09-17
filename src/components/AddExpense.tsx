'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Loader2, Users } from 'lucide-react';

interface AddExpenseProps {
  onExpenseAdded?: () => void;
}

interface Participant {
  userId?: string;
  customName?: string;
  amount?: number;
}

interface Friend {
  id: string;
  name: string;
  email: string;
  image?: string;
}

export default function AddExpense({ onExpenseAdded }: AddExpenseProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expenseType, setExpenseType] = useState<'personal' | 'shared'>('personal');
  const [splitType, setSplitType] = useState<'EQUAL' | 'EXACT'>('EQUAL');
  const [users, setUsers] = useState<Friend[]>([]);
  const [customParticipantName, setCustomParticipantName] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<Participant[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    description: '',
    category: 'food'
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

  // Fetch friends when component mounts and is opened
  useEffect(() => {
    if (isOpen) {
      fetchFriends();
    }
  }, [isOpen]);

  const fetchFriends = async () => {
    try {
      const response = await fetch('/api/friends');
      if (response.ok) {
        const result = await response.json();
        const data = result.data || result;
        setUsers(data.friends || data || []);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const expenseData: {
        description: string;
        amount: number;
        category: string;
        notes?: string;
        participants?: Participant[];
        splitType?: 'EQUAL' | 'EXACT';
      } = {
        description: formData.title,
        amount: parseFloat(formData.amount),
        category: formData.category,
        notes: formData.description || undefined,
      };

      // Add participants if it's a shared expense
      if (expenseType === 'shared' && selectedParticipants.length > 0) {
        expenseData.participants = selectedParticipants;
        expenseData.splitType = splitType;
      }

      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(expenseData),
      });

      if (response.ok) {
        setFormData({ title: '', amount: '', description: '', category: 'food' });
        setSelectedParticipants([]);
        setExpenseType('personal');
        setIsOpen(false);
        onExpenseAdded?.();
      } else {
        const errorData = await response.json();
        console.error('Failed to add expense:', errorData);
      }
    } catch (error) {
      console.error('Error adding expense:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2"
        size="lg"
      >
        <PlusCircle className="h-5 w-5" />
        Add Expense
      </Button>
    );
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Add New Expense</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
        </div>

        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-2">
            Title
          </label>
          <Input
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Enter expense title"
            required
          />
        </div>

        <div>
          <label htmlFor="amount" className="block text-sm font-medium mb-2">
            Amount
          </label>
          <Input
            type="number"
            id="amount"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            placeholder="0.00"
            step="0.01"
            min="0"
            required
          />
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium mb-2">
            Category
          </label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Expense Type Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Expense Type
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="expenseType"
                value="personal"
                checked={expenseType === 'personal'}
                onChange={(e) => setExpenseType(e.target.value as 'personal' | 'shared')}
                className="mr-2"
              />
              Personal Expense
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="expenseType"
                value="shared"
                checked={expenseType === 'shared'}
                onChange={(e) => setExpenseType(e.target.value as 'personal' | 'shared')}
                className="mr-2"
              />
              <Users className="h-4 w-4 mr-1" />
              Shared Expense
            </label>
          </div>
        </div>

        {/* Participants Section - Only show for shared expenses */}
        {expenseType === 'shared' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-2">
                Split Type
              </label>
              <select
                value={splitType}
                onChange={(e) => setSplitType(e.target.value as 'EQUAL' | 'EXACT')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="EQUAL">Split Equally</option>
                <option value="EXACT">Exact Amounts</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Add Participants
              </label>
              
              {/* Friends Section */}
              {users.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Your Friends</h4>
                  <div className="space-y-2">
                    {users.map((user) => {
                      const isSelected = selectedParticipants.some(p => p.userId === user.id);
                      return (
                        <div key={user.id} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedParticipants([...selectedParticipants, { userId: user.id }]);
                                } else {
                                  setSelectedParticipants(selectedParticipants.filter(p => p.userId !== user.id));
                                }
                              }}
                              className="mr-3"
                            />
                            <div>
                              <p className="font-medium">{user.name}</p>
                              <p className="text-sm text-gray-500">{user.email}</p>
                            </div>
                          </div>
                          {splitType === 'EXACT' && isSelected && (
                            <Input
                              type="number"
                              placeholder="Amount"
                              step="0.01"
                              min="0"
                              className="w-24"
                              onChange={(e) => {
                                const amount = parseFloat(e.target.value) || 0;
                                setSelectedParticipants(
                                  selectedParticipants.map(p =>
                                    p.userId === user.id ? { ...p, amount } : p
                                  )
                                );
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Custom Participants Section */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Add Custom Participant</h4>
                <div className="flex gap-2 mb-3">
                  <Input
                    type="text"
                    placeholder="Enter participant name"
                    value={customParticipantName}
                    onChange={(e) => setCustomParticipantName(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (customParticipantName.trim()) {
                        setSelectedParticipants([
                          ...selectedParticipants,
                          { customName: customParticipantName.trim() }
                        ]);
                        setCustomParticipantName('');
                      }
                    }}
                    disabled={!customParticipantName.trim()}
                  >
                    Add
                  </Button>
                </div>

                {/* Display selected custom participants */}
                {selectedParticipants.filter(p => p.customName).length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium text-gray-600">Custom Participants:</h5>
                    {selectedParticipants
                      .filter(p => p.customName)
                      .map((participant, index) => (
                        <div key={`custom_${index}`} className="flex items-center justify-between p-2 border rounded bg-gray-50">
                          <div className="flex items-center">
                            <span className="font-medium">{participant.customName}</span>
                            <span className="text-xs text-gray-500 ml-2">(Custom)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {splitType === 'EXACT' && (
                              <Input
                                type="number"
                                placeholder="Amount"
                                step="0.01"
                                min="0"
                                className="w-24"
                                value={participant.amount || ''}
                                onChange={(e) => {
                                  const amount = parseFloat(e.target.value) || 0;
                                  setSelectedParticipants(
                                    selectedParticipants.map(p =>
                                      p.customName === participant.customName ? { ...p, amount } : p
                                    )
                                  );
                                }}
                              />
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedParticipants(
                                  selectedParticipants.filter(p => p.customName !== participant.customName)
                                );
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-2">
            Description (Optional)
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Enter expense description"
            rows={3}
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            disabled={loading}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              'Add Expense'
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}