'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface Participant {
  id: string;
  share: number;
  status: 'PENDING' | 'PAID' | 'EXEMPT';
  user?: {
    id: string;
    name: string;
    email: string;
  };
  customName?: string;
}

interface SettlementRequestFormProps {
  expenseId: string;
  participant: Participant;
  expenseDescription: string;
  onRequestSent?: () => void;
}

export default function SettlementRequestForm({
  expenseId,
  participant,
  expenseDescription,
  onRequestSent
}: SettlementRequestFormProps) {
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 2,
    }).format(amount / 100);
  };

  const handleSubmitRequest = async () => {
    if (!participant.user?.id) {
      setMessage({ type: 'error', text: 'Cannot submit settlement request for custom participants' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    
    try {
      const response = await fetch(`/api/expenses/${expenseId}/settlements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantId: participant.id,
          notes: notes.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit settlement request');
      }

      setMessage({ type: 'success', text: 'Settlement request submitted successfully' });
      setNotes('');
      onRequestSent?.();
    } catch (error) {
      console.error('Error submitting settlement request:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to submit settlement request' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Don't show form if already paid
  if (participant.status === 'PAID') {
    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Settlement Confirmed</span>
          </div>
          <p className="text-sm text-green-600 dark:text-green-400 mt-1">
            Your payment of {formatAmount(participant.share)} has been confirmed.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Don't show form if exempt
  if (participant.status === 'EXEMPT') {
    return (
      <Card className="border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Exempt from Payment</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            You are exempt from paying for this expense.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Request Settlement</CardTitle>
        <CardDescription>
          Submit a settlement request for your share of &ldquo;{expenseDescription}&rdquo;
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
        
        <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
            Your Share:
          </span>
          <span className="text-lg font-bold text-blue-900 dark:text-blue-100">
            {formatAmount(participant.share)}
          </span>
        </div>
        
        <div className="space-y-2">
          <label htmlFor="settlement-notes" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Notes (Optional)
          </label>
          <textarea
            id="settlement-notes"
            placeholder="Add any notes about your payment..."
            value={notes}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
            rows={3}
            maxLength={500}
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {notes.length}/500 characters
          </p>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleSubmitRequest}
          disabled={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting Request...
            </>
          ) : (
            'Submit Settlement Request'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}