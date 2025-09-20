'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, Clock, User, Loader2 } from 'lucide-react';

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

interface SettlementApprovalCardProps {
  settlement: Settlement;
  expenseDescription: string;
  onStatusChanged?: () => void;
}

export default function SettlementApprovalCard({
  settlement,
  expenseDescription,
  onStatusChanged
}: SettlementApprovalCardProps) {
  const [responseNotes, setResponseNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 2,
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleResponse = async (action: 'approve' | 'reject') => {
    setIsProcessing(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/expenses/${settlement.id}/settlements`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settlementId: settlement.id,
          action,
          notes: responseNotes.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to ${action} settlement`);
      }

      setMessage({ 
        type: 'success', 
        text: `Settlement ${action === 'approve' ? 'approved' : 'rejected'} successfully` 
      });
      setResponseNotes('');
      onStatusChanged?.();
    } catch (error) {
      console.error(`Error ${action}ing settlement:`, error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : `Failed to ${action} settlement` 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // If settlement is already processed, show status
  if (settlement.status !== 'PENDING') {
    const isApproved = settlement.status === 'CONFIRMED';
    
    return (
      <Card className={`${
        isApproved 
          ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' 
          : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
      }`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                <span className="font-medium">{settlement.payer.name}</span>
              </div>
              <div className={`flex items-center gap-2 ${
                isApproved 
                  ? 'text-green-700 dark:text-green-300' 
                  : 'text-red-700 dark:text-red-300'
              }`}>
                {isApproved ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
                <span className="font-medium">
                  {isApproved ? 'Approved' : 'Rejected'}
                </span>
              </div>
            </div>
            <span className="font-bold text-lg">
              {formatAmount(settlement.amount)}
            </span>
          </div>
          
          {settlement.notes && (
            <div className="mt-3 p-2 bg-white dark:bg-gray-800 rounded border">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Payment Notes:</strong> {settlement.notes}
              </p>
            </div>
          )}
          
          <p className={`text-sm mt-2 ${
            isApproved 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-red-600 dark:text-red-400'
          }`}>
            {isApproved ? 'Payment confirmed' : 'Payment rejected'} on {formatDate(settlement.createdAt)}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Show approval interface for pending settlements
  return (
    <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <CardTitle className="text-lg text-orange-900 dark:text-orange-100">
              Settlement Request
            </CardTitle>
          </div>
          <span className="font-bold text-lg text-orange-900 dark:text-orange-100">
            {formatAmount(settlement.amount)}
          </span>
        </div>
        <CardDescription>
          {settlement.payer.name} has requested settlement for &ldquo;{expenseDescription}&rdquo;
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {message && (
          <div className={`p-3 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800' 
              : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'
          }`}>
            {message.text}
          </div>
        )}

        <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border">
          <User className="w-5 h-5 text-gray-500" />
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {settlement.payer.name}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {settlement.payer.email}
            </p>
          </div>
        </div>

        {settlement.notes && (
          <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Payment Notes:
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {settlement.notes}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="response-notes" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Response Notes (Optional)
          </label>
          <Textarea
            id="response-notes"
            placeholder="Add any notes about your decision..."
            value={responseNotes}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setResponseNotes(e.target.value)}
            rows={2}
            maxLength={500}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {responseNotes.length}/500 characters
          </p>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Requested on {formatDate(settlement.createdAt)}
        </p>
      </CardContent>
      
      <CardFooter className="flex gap-2">
        <Button
          onClick={() => handleResponse('reject')}
          disabled={isProcessing}
          variant="destructive"
          className="flex-1"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <XCircle className="w-4 h-4 mr-2" />
          )}
          Reject
        </Button>
        <Button
          onClick={() => handleResponse('approve')}
          disabled={isProcessing}
          className="flex-1 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4 mr-2" />
          )}
          Approve
        </Button>
      </CardFooter>
    </Card>
  );
}