'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
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
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expenseType, setExpenseType] = useState<'personal' | 'shared'>('shared'); // Default to shared for testing
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

  // Calculate owner's amount for exact split
  const calculateOwnerAmount = () => {
    if (splitType !== 'EXACT' || !formData.amount) return 0;
    const totalParticipantAmount = selectedParticipants.reduce((sum, p) => sum + (p.amount || 0), 0);
    const expenseAmount = parseFloat(formData.amount) || 0;
    return Math.max(0, expenseAmount - totalParticipantAmount);
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
        // For exact split, automatically calculate owner's amount as remainder
        if (splitType === 'EXACT') {
          // Check if any participant has no amount specified
          const hasInvalidAmounts = selectedParticipants.some(p => !p.amount || p.amount <= 0);
          if (hasInvalidAmounts) {
            alert('Please enter valid amounts for all participants when using exact split.');
            setLoading(false);
            return;
          }
          
          // Calculate total participant amounts and owner's remainder
          const totalParticipantAmount = selectedParticipants.reduce((sum, p) => sum + (p.amount || 0), 0);
          const expenseAmount = parseFloat(formData.amount);
          const ownerAmount = expenseAmount - totalParticipantAmount;
          
          // Validate that owner's amount is not negative
          if (ownerAmount < 0) {
            alert(`Participant amounts (${totalParticipantAmount.toFixed(2)}) exceed the total expense amount (${expenseAmount.toFixed(2)}). Please adjust the amounts.`);
            setLoading(false);
            return;
          }
          
          // Add owner as participant with remainder amount if there's an amount for them
          const participantsWithOwner = [...selectedParticipants];
          if (ownerAmount > 0 && session?.user) {
            participantsWithOwner.push({
              userId: session.user.id,
              amount: ownerAmount
            });
          }
          
          expenseData.participants = participantsWithOwner;
        } else {
          // For equal split, just use selected participants
          expenseData.participants = selectedParticipants;
        }
        
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
        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md"
        size="lg"
      >
        <PlusCircle className="h-5 w-5" />
        Add Expense
      </Button>
    );
  }

  return (
    <Card className="overflow-hidden shadow-lg border-0">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Add New Expense</h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="text-white hover:bg-blue-500/20"
          >
            ✕
          </Button>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="p-4 sm:p-6">
        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Enter expense title"
                className="w-full"
                required
              />
            </div>

            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                Amount (LKR) *
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
                className="w-full"
                required
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                Category *
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
          </div>

          {/* Expense Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Expense Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="expenseType"
                  value="personal"
                  checked={expenseType === 'personal'}
                  onChange={(e) => setExpenseType(e.target.value as 'personal' | 'shared')}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium">Personal Expense</div>
                  <div className="text-sm text-gray-500">Just for you</div>
                </div>
              </label>
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="expenseType"
                  value="shared"
                  checked={expenseType === 'shared'}
                  onChange={(e) => setExpenseType(e.target.value as 'personal' | 'shared')}
                  className="mr-3"
                />
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-2 text-blue-600" />
                  <div>
                    <div className="font-medium">Shared Expense</div>
                    <div className="text-sm text-gray-500">Split with others</div>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Participants Section - Only show for shared expenses */}
          {expenseType === 'shared' && (
            <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Split Type
                </label>
                <select
                  value={splitType}
                  onChange={(e) => setSplitType(e.target.value as 'EQUAL' | 'EXACT')}
                  className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="EQUAL">Split Equally</option>
                  <option value="EXACT">Exact Amounts</option>
                </select>
                {splitType === 'EXACT' && (
                  <p className="text-xs text-blue-600 mt-1">
                    Note: Enter amounts for other participants. Your share will be calculated automatically as the remainder.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Add Participants
                </label>
                
                {/* Friends Section */}
                {users.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Your Friends</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {users.map((user) => {
                        const isSelected = selectedParticipants.some(p => p.userId === user.id);
                        return (
                          <div key={user.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                            <div className="flex items-center flex-1 min-w-0">
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
                                className="mr-3 flex-shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm truncate">{user.name}</p>
                                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                              </div>
                            </div>
                            {splitType === 'EXACT' && isSelected && (
                              <Input
                                type="number"
                                placeholder="Amount"
                                step="0.01"
                                min="0"
                                className="w-20 sm:w-24 ml-3 flex-shrink-0"
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
                  <p className="text-xs text-orange-600 mb-3 p-2 bg-orange-50 rounded-md">
                    Note: Custom participants cannot be included in automatic settlements. Only registered friends can owe/receive money.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 mb-3">
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
                      className="w-full sm:w-auto"
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
                          <div key={`custom_${index}`} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg bg-white gap-2">
                            <div className="flex items-center">
                              <span className="font-medium">{participant.customName}</span>
                              <span className="text-xs text-gray-500 ml-2 px-2 py-1 bg-gray-100 rounded">(Custom)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {splitType === 'EXACT' && (
                                <Input
                                  type="number"
                                  placeholder="Amount"
                                  step="0.01"
                                  min="0"
                                  className="w-20 sm:w-24"
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
                                className="flex-shrink-0"
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

              {/* Owner Amount Display for Exact Split */}
              {splitType === 'EXACT' && selectedParticipants.length > 0 && formData.amount && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <span className="text-sm font-medium text-emerald-800">
                      Your share (remainder):
                    </span>
                    <span className="text-xl font-bold text-emerald-700">
                      LKR {calculateOwnerAmount().toFixed(2)}
                    </span>
                  </div>
                  {session?.user && (
                    <p className="text-xs text-emerald-600 mt-2">
                      {session.user.name} • This amount will be automatically added to the expense
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
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

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 order-1 sm:order-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
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
        </div>
      </form>
    </Card>
  );
}