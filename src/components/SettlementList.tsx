'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle, CheckCircle, Clock, XCircle, UserCheck } from 'lucide-react';
import SettlementApprovalCard from './SettlementApprovalCard';

interface Settlement {
  id: string;
  amount: number;
  notes?: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
  createdAt: string;
  payer: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
}

interface Participant {
  id: string;
  share: number;
  status: 'PENDING' | 'PAID';
  userId?: string;
  customName?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
}

interface SettlementListProps {
  expenseId: string;
  expenseDescription: string;
  isOwner: boolean;
  refreshTrigger?: number;
}

export default function SettlementList({
  expenseId,
  expenseDescription,
  isOwner,
  refreshTrigger = 0
}: SettlementListProps) {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSettlements = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/expenses/${expenseId}/settlements`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch settlements');
      }

      setSettlements(result.data || []);
    } catch (error) {
      console.error('Error fetching settlements:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch settlements');
    } finally {
      setLoading(false);
    }
  };

  const handleOwnerMarkSettled = async (participantId: string, participantAmount: number) => {
    try {
      setActionLoading(participantId);

      const response = await fetch(`/api/expenses/${expenseId}/settlements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantId,
          amount: participantAmount,
          notes: `Marked as settled by expense owner`,
          status: 'CONFIRMED' // Owner can directly confirm
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to mark settlement');
      }

      // Refresh data
      await handleRefresh();
    } catch (error) {
      console.error('Error marking settlement:', error);
      setError(error instanceof Error ? error.message : 'Failed to mark settlement');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch settlements
      const settlementsResponse = await fetch(`/api/expenses/${expenseId}/settlements`);
      const settlementsResult = await settlementsResponse.json();

      if (!settlementsResponse.ok) {
        throw new Error(settlementsResult.error || 'Failed to fetch settlements');
      }

      setSettlements(settlementsResult.data || []);

      // Fetch participants
      const participantsResponse = await fetch(`/api/expenses/${expenseId}`);
      const participantsResult = await participantsResponse.json();

      if (!participantsResponse.ok) {
        throw new Error(participantsResult.error || 'Failed to fetch expense details');
      }

      const expense = participantsResult.data || participantsResult;
      setParticipants(expense.participants || []);
    } catch (error) {
      console.error('Error loading data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [expenseId]);

  useEffect(() => {
    handleRefresh();
  }, [expenseId, refreshTrigger, handleRefresh]);

  const handleStatusChanged = () => {
    fetchSettlements();
  };

  const getStatusIcon = (status: Settlement['status']) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-4 h-4 text-orange-500" />;
      case 'CONFIRMED':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'REJECTED':
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusText = (status: Settlement['status']) => {
    switch (status) {
      case 'PENDING':
        return 'Pending';
      case 'CONFIRMED':
        return 'Approved';
      case 'REJECTED':
        return 'Rejected';
    }
  };

  const getStatusColor = (status: Settlement['status']) => {
    switch (status) {
      case 'PENDING':
        return 'text-orange-600 dark:text-orange-400';
      case 'CONFIRMED':
        return 'text-green-600 dark:text-green-400';
      case 'REJECTED':
        return 'text-red-600 dark:text-red-400';
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 2,
    }).format(amount / 100);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600 dark:text-gray-400">Loading settlements...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Error loading settlements</span>
          </div>
          <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
          <Button 
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            className="mt-3"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (settlements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Settlements</CardTitle>
          <CardDescription>Settlement requests for this expense</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No settlement requests yet</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              Participants can submit settlement requests when they&apos;ve made their payments
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group settlements by status for better organization
  const pendingSettlements = settlements.filter(s => s.status === 'PENDING');
  const processedSettlements = settlements.filter(s => s.status !== 'PENDING');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-lg">Settlements</CardTitle>
            <CardDescription>Settlement requests for this expense</CardDescription>
          </div>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-orange-600" />
                <span className="font-medium text-orange-900 dark:text-orange-100">Pending</span>
              </div>
              <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {pendingSettlements.length}
              </span>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="font-medium text-green-900 dark:text-green-100">Approved</span>
              </div>
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                {settlements.filter(s => s.status === 'CONFIRMED').length}
              </span>
            </div>
            <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-1">
                <XCircle className="w-4 h-4 text-red-600" />
                <span className="font-medium text-red-900 dark:text-red-100">Rejected</span>
              </div>
              <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                {settlements.filter(s => s.status === 'REJECTED').length}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Settlements - Show approval cards for owners, simple list for participants */}
      {pendingSettlements.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Pending Requests {isOwner && '(Awaiting Your Approval)'}
          </h3>
          {isOwner ? (
            <div className="space-y-4">
              {pendingSettlements.map((settlement) => (
                <SettlementApprovalCard
                  key={settlement.id}
                  settlement={settlement}
                  expenseDescription={expenseDescription}
                  onStatusChanged={handleStatusChanged}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {pendingSettlements.map((settlement) => (
                <Card key={settlement.id} className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(settlement.status)}
                          <span className="font-medium">{settlement.payer.name}</span>
                        </div>
                        <span className={`text-sm ${getStatusColor(settlement.status)}`}>
                          {getStatusText(settlement.status)}
                        </span>
                      </div>
                      <span className="font-bold text-lg">{formatAmount(settlement.amount)}</span>
                    </div>
                    {settlement.notes && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        <strong>Notes:</strong> {settlement.notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Processed Settlements */}
      {processedSettlements.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Settlement History
          </h3>
          <div className="space-y-3">
            {processedSettlements.map((settlement) => (
              <Card key={settlement.id} className={
                settlement.status === 'CONFIRMED'
                  ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                  : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
              }>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(settlement.status)}
                        <span className="font-medium">{settlement.payer.name}</span>
                      </div>
                      <span className={`text-sm ${getStatusColor(settlement.status)}`}>
                        {getStatusText(settlement.status)}
                      </span>
                    </div>
                    <span className="font-bold text-lg">{formatAmount(settlement.amount)}</span>
                  </div>
                  {settlement.notes && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      <strong>Notes:</strong> {settlement.notes}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {new Date(settlement.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Owner Actions - Mark participants as settled directly */}
      {isOwner && participants.length > 0 && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
          <CardHeader>
            <CardTitle className="text-lg text-blue-900 dark:text-blue-100">Owner Actions</CardTitle>
            <CardDescription className="text-blue-700 dark:text-blue-300">
              Mark participants as settled without waiting for their settlement requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {participants
                .filter(participant => {
                  // Show participants who are still pending (not paid) and don't have approved settlements
                  const hasApprovedSettlement = settlements.some(
                    s => s.status === 'CONFIRMED' && 
                    (participant.userId ? s.payer.id === participant.userId : false)
                  );
                  return participant.status === 'PENDING' && !hasApprovedSettlement;
                })
                .map(participant => (
                  <div key={participant.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-700">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {participant.userId ? participant.user?.name : participant.customName}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Amount: {formatAmount(participant.share)}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleOwnerMarkSettled(participant.id, participant.share)}
                      disabled={actionLoading === participant.id}
                      variant="outline"
                      size="sm"
                      className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700 dark:text-green-400 dark:border-green-400 dark:hover:bg-green-900/20"
                    >
                      <UserCheck className="w-4 h-4 mr-2" />
                      {actionLoading === participant.id ? 'Marking...' : 'Mark Settled'}
                    </Button>
                  </div>
                ))}
              {participants.filter(participant => {
                const hasApprovedSettlement = settlements.some(
                  s => s.status === 'CONFIRMED' && 
                  (participant.userId ? s.payer.id === participant.userId : false)
                );
                return participant.status === 'PENDING' && !hasApprovedSettlement;
              }).length === 0 && (
                <div className="text-center py-4">
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-gray-600 dark:text-gray-400">All participants have been settled</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}