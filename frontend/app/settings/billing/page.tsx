'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  CreditCardIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowTopRightOnSquareIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import Header from '../../../components/Header';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Progress } from '../../../components/ui';
import { API_BASE } from '../../../lib/api';

interface BillingInfo {
  subscription?: {
    id: string;
    status: 'active' | 'canceled' | 'past_due' | 'trialing';
    plan: string;
    price: number;
    period: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  };
  usage: {
    documentsUsed: number;
    documentsLimit: number;
    tokensUsed: number;
    tokensLimit: number;
    period: string;
  };
  paymentMethod?: {
    id: string;
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  invoices: Array<{
    id: string;
    date: string;
    amount: number;
    status: 'paid' | 'pending' | 'failed';
    downloadUrl: string;
  }>;
}

export default function BillingPage() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = async () => {
    try {
      const r = await fetch(`${API_BASE}/billing/status`, { credentials: 'include' });
      const j = await r.json();
      setStatus(j);
    } catch (error) {
      console.error('Failed to load billing status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const checkout = async () => {
    setActionLoading('checkout');
    try {
      const r = await fetch(`${API_BASE}/billing/checkout`, { method: 'POST', credentials: 'include' });
      const j = await r.json();
      if (j?.url) window.location.href = j.url;
    } catch (error) {
      console.error('Checkout failed:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const portal = async () => {
    setActionLoading('portal');
    try {
      const r = await fetch(`${API_BASE}/billing/portal`, { method: 'POST', credentials: 'include' });
      const j = await r.json();
      if (j?.url) window.location.href = j.url;
    } catch (error) {
      console.error('Portal access failed:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'badge-success';
      case 'trialing': return 'badge-primary';
      case 'past_due': return 'badge-warning';
      case 'canceled': return 'badge-error';
      default: return 'badge';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen relative">
        <div className="aurora fixed inset-0 pointer-events-none" />
        <Header />
        <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded w-1/3"></div>
            <div className="grid gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-48 bg-neutral-200 dark:bg-neutral-700 rounded-2xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const usagePercentage = status?.daily_generations_left 
    ? ((5 - status.daily_generations_left) / 5) * 100 
    : 0;
  
  const tokensPercentage = status?.monthly_tokens_left 
    ? ((100000 - status.monthly_tokens_left) / 100000) * 100 
    : 0;

  return (
    <div className="min-h-screen relative">
      <div className="aurora fixed inset-0 pointer-events-none" />
      <Header />
      
      <main className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
            Billing & Usage
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Manage your subscription, payment methods, and view usage statistics.
          </p>
        </div>

        <div className="grid gap-6">
          {/* Subscription Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DocumentTextIcon className="w-5 h-5" />
                Current Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                    {status?.tier?.charAt(0).toUpperCase() + status?.tier?.slice(1) || 'Free'} Plan
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-400">
                    {status?.tier === 'pro' ? '$29/month' : 
                     status?.tier === 'team' ? '$99/month' : 
                     'Free forever'}
                  </p>
                </div>
                <Badge className={getStatusColor(status?.status || 'inactive')}>
                  {status?.status?.charAt(0).toUpperCase() + status?.status?.slice(1) || 'Inactive'}
                </Badge>
              </div>

              <div className="flex gap-3">
                <Link href="/pricing">
                  <Button variant="outline">
                    {status?.tier === 'free' ? 'Upgrade Plan' : 'Change Plan'}
                  </Button>
                </Link>
                
                {status?.tier === 'free' ? (
                  <Button 
                    variant="primary"
                    onClick={checkout}
                    loading={actionLoading === 'checkout'}
                  >
                    Upgrade to Pro
                  </Button>
                ) : (
                  <Button 
                    variant="outline"
                    onClick={portal}
                    loading={actionLoading === 'portal'}
                  >
                    Manage Subscription
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Usage Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Usage This Month</CardTitle>
              <CardDescription>
                Your current usage and limits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Daily Documents Remaining</span>
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">
                    {status?.daily_generations_left ?? 0} left today
                  </span>
                </div>
                <Progress 
                  value={5 - (status?.daily_generations_left ?? 5)} 
                  max={5}
                  variant={usagePercentage > 80 ? 'warning' : usagePercentage > 60 ? 'default' : 'success'}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Monthly Tokens Remaining</span>
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">
                    {((status?.monthly_tokens_left ?? 0) / 1000).toFixed(0)}K left
                  </span>
                </div>
                <Progress 
                  value={100000 - (status?.monthly_tokens_left ?? 100000)} 
                  max={100000}
                  variant={tokensPercentage > 90 ? 'danger' : tokensPercentage > 70 ? 'warning' : 'success'}
                />
              </div>

              {(usagePercentage > 80 || tokensPercentage > 80) && status?.tier === 'free' && (
                <div className="bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-warning-700 dark:text-warning-300">
                    <ExclamationTriangleIcon className="w-5 h-5" />
                    <p className="font-medium">Usage Warning</p>
                  </div>
                  <p className="text-sm text-warning-600 dark:text-warning-400 mt-1">
                    You're approaching your limits. Consider upgrading to Pro for unlimited usage.
                  </p>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="mt-3"
                    onClick={checkout}
                  >
                    Upgrade Now
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common billing and subscription actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  onClick={load}
                  className="flex flex-col items-center p-6 h-auto"
                >
                  <DocumentTextIcon className="w-8 h-8 mb-2 text-primary-500" />
                  <span className="font-medium">Refresh Usage</span>
                  <span className="text-sm text-neutral-500">Update current stats</span>
                </Button>

                <Link href="/pricing">
                  <Button
                    variant="outline"
                    className="flex flex-col items-center p-6 h-auto w-full"
                  >
                    <CreditCardIcon className="w-8 h-8 mb-2 text-primary-500" />
                    <span className="font-medium">View Plans</span>
                    <span className="text-sm text-neutral-500">Compare all options</span>
                  </Button>
                </Link>

                <Button
                  variant="outline"
                  onClick={portal}
                  loading={actionLoading === 'portal'}
                  className="flex flex-col items-center p-6 h-auto"
                >
                  <ArrowTopRightOnSquareIcon className="w-8 h-8 mb-2 text-primary-500" />
                  <span className="font-medium">Billing Portal</span>
                  <span className="text-sm text-neutral-500">Manage payments</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
