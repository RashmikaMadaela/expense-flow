'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowUpCircle, ArrowDownCircle, Send, CheckCircle, Clock } from 'lucide-react';

interface SettlementSummary {
  userId: string;
  userName: string;
  userImage?: string;
  amountOwedToMe: number; // What they owe me
  amountIOwe: number; // What I owe them
  netAmount: number; // Positive = they owe me, Negative = I owe them
  relatedExpenses: {
    id: string;
    description: string;
    amount: number;
    date: string;
    myShare: number;
    settledAmount: number;
  }[];
}

interface PendingSettlement {
  id: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  status: 'pending' | 'completed' | 'rejected';
  createdAt: string;
  fromUser: {
    name: string;
    image?: string;
  };
  toUser: {
    name: string;
    image?: string;
  };
  relatedExpenseId?: string;
}

export default function SettlementsPage() {
  const { data: session } = useSession();
  const [settlements, setSettlements] = useState<SettlementSummary[]>([]);
  const [pendingSettlements, setPendingSettlements] = useState<PendingSettlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user) {
      fetchSettlements();
      fetchPendingSettlements();
    }
  }, [session]);

  const fetchSettlements = async () => {
    try {
      const response = await fetch('/api/settlements/summary');
      if (response.ok) {
        const result = await response.json();
        setSettlements(result.data || []);
      } else {
        console.error('SettlementsPage - API Error:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching settlements:', error);
    }
  };

  const fetchPendingSettlements = async () => {
    try {
      const response = await fetch('/api/settlements/pending');
      if (response.ok) {
        const result = await response.json();
        setPendingSettlements(result.data || []);
      } else {
        console.error('Failed to fetch pending settlements, status:', response.status);
      }
    } catch (error) {
      console.error('Error fetching pending settlements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDirectSettlement = async (userId: string, amount: number) => {
    setProcessingId(userId);
    try {
      const response = await fetch('/api/settlements/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toUserId: userId,
          amount: amount
        })
      });

      const result = await response.json();

      if (response.ok) {
        // Refresh data
        await fetchSettlements();
        await fetchPendingSettlements();
      } else {
        console.error('Failed to process direct settlement:', result.error || 'Unknown error');
        alert(`Failed to process settlement: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error processing direct settlement:', error);
      alert('Error processing settlement. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleSettlementRequest = async (userId: string, amount: number) => {
    setProcessingId(userId);
    try {
      const response = await fetch('/api/settlements/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toUserId: userId,
          amount: amount
        })
      });

      const result = await response.json();

      if (response.ok) {
        // Refresh data
        await fetchPendingSettlements();
      } else {
        console.error('Failed to send settlement request:', result.error || 'Unknown error');
        alert(`Failed to send settlement request: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error sending settlement request:', error);
      alert('Error sending settlement request. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleSettlementResponse = async (settlementId: string, action: 'accept' | 'reject') => {
    setProcessingId(settlementId);
    try {
      const response = await fetch(`/api/settlements/${settlementId}/${action}`, {
        method: 'POST'
      });

      const result = await response.json();

      if (response.ok) {
        // Refresh data
        await fetchSettlements();
        await fetchPendingSettlements();
      } else {
        console.error(`Failed to ${action} settlement:`, result.error || 'Unknown error');
        alert(`Failed to ${action} settlement: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(`Error ${action}ing settlement:`, error);
      alert(`Error ${action}ing settlement. Please try again.`);
    } finally {
      setProcessingId(null);
    }
  };

  const formatCurrency = (amount: number) => {
    // Convert from cents to dollars
    const amountInDollars = amount / 100;
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR'
    }).format(amountInDollars);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading settlements...</p>
        </div>
      </div>
    );
  }

  const owedToMe = settlements.filter(s => s.netAmount > 0);
  const iOwe = settlements.filter(s => s.netAmount < 0);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Settlements</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">Manage your debts and credits with friends</p>
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 Settlements automatically track amounts from shared expenses with registered friends
            </p>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
            <TabsTrigger value="owed-to-me" className="text-xs sm:text-sm">
              Owed to Me <span className="hidden sm:inline">({owedToMe.length})</span>
            </TabsTrigger>
            <TabsTrigger value="i-owe" className="text-xs sm:text-sm">
              I Owe <span className="hidden sm:inline">({iOwe.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 sm:space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Owed to Me</CardTitle>
                  <ArrowUpCircle className="h-4 w-4 text-emerald-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold text-emerald-600">
                    {formatCurrency(owedToMe.reduce((sum, s) => sum + s.netAmount, 0))}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    From {owedToMe.length} people
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total I Owe</CardTitle>
                  <ArrowDownCircle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold text-red-600">
                    {formatCurrency(Math.abs(iOwe.reduce((sum, s) => sum + s.netAmount, 0)))}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    To {iOwe.length} people
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
                  <Clock className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold text-orange-600">
                    {pendingSettlements.length}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Awaiting response
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Pending Settlements */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Pending Settlement Requests</CardTitle>
                <CardDescription>
                  Settlements waiting for your response ({pendingSettlements.length} found)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {pendingSettlements.length === 0 ? (
                  <div className="text-center text-gray-500 py-6 sm:py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <Clock className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="font-medium mb-2">No pending settlement requests</p>
                    <p className="text-sm">
                      Settlement requests from others will appear here for you to accept or reject.
                    </p>
                  </div>
                ) : (
                  pendingSettlements.map((settlement) => (
                    <div key={settlement.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors space-y-3 sm:space-y-0">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={settlement.fromUser.image} />
                          <AvatarFallback>
                            {settlement.fromUser.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{settlement.fromUser.name}</p>
                          <p className="text-sm text-gray-600">
                            Requesting {formatCurrency(settlement.amount)}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSettlementResponse(settlement.id, 'reject')}
                          disabled={processingId === settlement.id}
                          className="flex-1 sm:flex-none"
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSettlementResponse(settlement.id, 'accept')}
                          disabled={processingId === settlement.id}
                          className="flex-1 sm:flex-none"
                        >
                          Accept
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="owed-to-me" className="space-y-4 sm:space-y-6">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ArrowUpCircle className="h-5 w-5 text-emerald-600" />
                  <span>People Who Owe Me</span>
                </CardTitle>
                <CardDescription>
                  You can directly settle these amounts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {owedToMe.length === 0 ? (
                  <div className="text-center text-gray-500 py-6 sm:py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <ArrowUpCircle className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-lg font-medium mb-2">No one owes you money right now</p>
                    <p className="text-sm text-gray-400 mb-4">Settlements appear when you create shared expenses with registered friends</p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                      <p className="text-blue-800 text-sm font-medium mb-2">💡 To see settlements:</p>
                      <ul className="text-blue-700 text-sm space-y-1">
                        <li>• Add friends from the Friends page</li>
                        <li>• Create shared expenses with registered friends</li>
                        <li>• Custom participants cannot settle digitally</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  owedToMe.map((settlement) => (
                    <div key={settlement.userId} className="border rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 space-y-3 sm:space-y-0">
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarImage src={settlement.userImage} />
                            <AvatarFallback>
                              {settlement.userName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{settlement.userName}</p>
                            <p className="text-lg font-bold text-emerald-600">
                              {formatCurrency(settlement.netAmount)}
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleDirectSettlement(settlement.userId, settlement.netAmount)}
                          disabled={processingId === settlement.userId}
                          className="flex items-center justify-center space-x-2 w-full sm:w-auto"
                        >
                          <CheckCircle className="h-4 w-4" />
                          <span>Settle</span>
                        </Button>
                      </div>
                      
                      {settlement.relatedExpenses.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-sm font-medium text-gray-700 mb-2">Related Expenses:</p>
                          <div className="space-y-1">
                            {settlement.relatedExpenses.map((expense) => (
                              <div key={expense.id} className="text-sm text-gray-600 flex justify-between">
                                <span className="truncate mr-2">{expense.description}</span>
                                <span className="flex-shrink-0">{formatCurrency(expense.myShare - expense.settledAmount)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="i-owe" className="space-y-4 sm:space-y-6">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ArrowDownCircle className="h-5 w-5 text-red-600" />
                  <span>People I Owe</span>
                </CardTitle>
                <CardDescription>
                  Send settlement requests to pay your debts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {iOwe.length === 0 ? (
                  <div className="text-center text-gray-500 py-6 sm:py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <ArrowDownCircle className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-lg font-medium mb-2">You don&apos;t owe anyone money right now</p>
                    <p className="text-sm text-gray-400">Settlements track what you owe from shared expenses with registered friends</p>
                  </div>
                ) : (
                  iOwe.map((settlement) => (
                    <div key={settlement.userId} className="border rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 space-y-3 sm:space-y-0">
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarImage src={settlement.userImage} />
                            <AvatarFallback>
                              {settlement.userName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{settlement.userName}</p>
                            <p className="text-lg font-bold text-red-600">
                              {formatCurrency(Math.abs(settlement.netAmount))}
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleSettlementRequest(settlement.userId, Math.abs(settlement.netAmount))}
                          disabled={processingId === settlement.userId}
                          variant="outline"
                          className="flex items-center justify-center space-x-2 w-full sm:w-auto"
                        >
                          <Send className="h-4 w-4" />
                          <span>Request Settlement</span>
                        </Button>
                      </div>
                      
                      {settlement.relatedExpenses.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-sm font-medium text-gray-700 mb-2">Related Expenses:</p>
                          <div className="space-y-1">
                            {settlement.relatedExpenses.map((expense) => (
                              <div key={expense.id} className="text-sm text-gray-600 flex justify-between">
                                <span className="truncate mr-2">{expense.description}</span>
                                <span className="flex-shrink-0">{formatCurrency(expense.myShare - expense.settledAmount)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}