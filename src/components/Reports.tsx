'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Download, TrendingUp, PieChart, BarChart3, ArrowLeft } from 'lucide-react';

interface ReportsProps {
  onClose: () => void;
}

interface ReportData {
  totalExpenses: number;
  monthlyExpenses: number;
  expenseCount: number;
  categories: { [key: string]: number };
  monthlyTrend: { month: string; amount: number }[];
  topCategories: { category: string; amount: number; percentage: number }[];
}

export default function Reports({ onClose }: ReportsProps) {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'month' | 'quarter' | 'year'>('month');

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/reports?timeframe=${timeframe}`);
      if (response.ok) {
        const result = await response.json();
        const data = result.data || result;
        setReportData(data);
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe]);

  const formatAmount = (amount: number | null | undefined) => {
    const value = amount || 0;
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR'
    }).format(value);
  };

  const exportToCSV = () => {
    if (!reportData) return;

    let csvContent = 'Category,Amount,Percentage\n';
    reportData.topCategories.forEach(cat => {
      csvContent += `${cat.category},${cat.amount},${cat.percentage}%\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `expense-report-${timeframe}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="outline" onClick={onClose}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Expense Reports</h1>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-32 bg-gray-200 rounded"></div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={onClose}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Expense Reports</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Timeframe Selector */}
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as 'month' | 'quarter' | 'year')}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
            
            <Button onClick={exportToCSV} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {reportData && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {formatAmount(reportData.totalExpenses)}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-600" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Average per {timeframe}</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {formatAmount(reportData.monthlyExpenses)}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-green-600" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {reportData.expenseCount}
                    </p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-purple-600" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Categories</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {Object.keys(reportData.categories).length}
                    </p>
                  </div>
                  <PieChart className="h-8 w-8 text-orange-600" />
                </div>
              </Card>
            </div>

            {/* Category Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Top Categories</h2>
                <div className="space-y-4">
                  {reportData.topCategories.map((category, index) => (
                    <div key={category.category} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full bg-blue-${(index + 3) * 100}`}></div>
                        <span className="font-medium">{category.category}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatAmount(category.amount)}</p>
                        <p className="text-sm text-gray-500">{category.percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Spending Insights</h2>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold text-blue-800">Highest Category</h3>
                    <p className="text-blue-600">
                      {reportData.topCategories[0]?.category || 'N/A'} - {formatAmount(reportData.topCategories[0]?.amount || 0)}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h3 className="font-semibold text-green-800">Average Transaction</h3>
                    <p className="text-green-600">
                      {formatAmount(reportData.totalExpenses / (reportData.expenseCount || 1))}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h3 className="font-semibold text-purple-800">Daily Average</h3>
                    <p className="text-purple-600">
                      {formatAmount(reportData.totalExpenses / 30)} {/* Assuming 30 days */}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}