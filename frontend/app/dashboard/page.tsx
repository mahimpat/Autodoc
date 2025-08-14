'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  DocumentTextIcon,
  ChartBarIcon,
  UserIcon,
  CogIcon,
  PlusIcon,
  EyeIcon,
  TrashIcon,
  ClockIcon,
  CalendarDaysIcon,
  StarIcon,
  BoltIcon
} from '@heroicons/react/24/outline';
import Header from '../../components/Header';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Stats, Badge, Progress, Avatar, AvatarFallback } from '../../components/ui';
import { API_BASE } from '../../lib/api';

interface Document {
  id: string;
  title: string;
  template: string;
  created_at: string;
  status: 'completed' | 'generating' | 'error';
  word_count?: number;
}

interface UsageStats {
  daily_generations_used: number;
  daily_generations_left: number;
  monthly_tokens_used: number;
  monthly_tokens_limit: number;
  tier: 'free' | 'pro' | 'team';
  total_documents: number;
  documents_this_month: number;
}

export default function Dashboard() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch user info, documents, and stats in parallel
        const [docsRes, statsRes, userRes] = await Promise.all([
          fetch(`${API_BASE}/documents/`, { credentials: 'include' }),
          fetch(`${API_BASE}/billing/status`, { credentials: 'include' }),
          fetch(`${API_BASE}/auth/me`, { credentials: 'include' })
        ]);

        if (docsRes.ok) {
          const docsData = await docsRes.json();
          setDocuments(docsData.documents || []);
        }

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }

        if (userRes.ok) {
          const userData = await userRes.json();
          setUser(userData);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const deleteDocument = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
      const res = await fetch(`${API_BASE}/documents/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (res.ok) {
        setDocuments(docs => docs.filter(d => d.id !== id));
      }
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  const getTemplateDisplay = (template: string) => {
    const templates: Record<string, { name: string; color: string; badge: string }> = {
      'tdd': { name: 'Technical Design Doc', color: 'from-blue-500 to-indigo-500', badge: 'TDD' },
      'research_report': { name: 'Research Report', color: 'from-purple-500 to-pink-500', badge: 'RPT' },
      'readme_changelog': { name: 'README + Changelog', color: 'from-emerald-500 to-teal-500', badge: 'OSS' }
    };
    return templates[template] || { name: template, color: 'from-gray-500 to-gray-600', badge: 'DOC' };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen relative">
        <div className="aurora fixed inset-0 pointer-events-none" />
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-white/20 rounded-lg w-1/3"></div>
            <div className="grid md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-white/20 rounded-2xl"></div>
              ))}
            </div>
            <div className="h-96 bg-white/20 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  const dailyProgress = stats ? (stats.daily_generations_used / (stats.daily_generations_used + stats.daily_generations_left)) * 100 : 0;
  const monthlyProgress = stats ? (stats.monthly_tokens_used / stats.monthly_tokens_limit) * 100 : 0;

  return (
    <div className="min-h-screen relative">
      <div className="aurora fixed inset-0 pointer-events-none" />
      <Header />
      
      <main className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Welcome back{user?.name ? `, ${user.name}` : ''}!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Here's an overview of your document generation activity
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/settings">
              <Button variant="outline" size="sm">
                <CogIcon className="w-4 h-4" />
                Settings
              </Button>
            </Link>
            <Link href="/">
              <Button variant="primary">
                <PlusIcon className="w-4 h-4" />
                New Document
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Stats
            title="Total Documents"
            value={stats?.total_documents || 0}
            icon={<DocumentTextIcon className="w-6 h-6" />}
            change={{
              value: `+${stats?.documents_this_month || 0} this month`,
              trend: 'up'
            }}
          />
          <Stats
            title="Daily Generations"
            value={`${stats?.daily_generations_left || 0} left`}
            description={`${stats?.daily_generations_used || 0} used today`}
            icon={<BoltIcon className="w-6 h-6" />}
          />
          <Stats
            title="Monthly Tokens"
            value={`${((stats?.monthly_tokens_used || 0) / 1000).toFixed(0)}K`}
            description={`of ${((stats?.monthly_tokens_limit || 0) / 1000).toFixed(0)}K limit`}
            icon={<ChartBarIcon className="w-6 h-6" />}
          />
          <Stats
            title="Current Plan"
            value={stats?.tier?.toUpperCase() || 'FREE'}
            icon={<StarIcon className="w-6 h-6" />}
            description="Active subscription"
          />
        </div>

        {/* Usage Progress */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDaysIcon className="w-5 h-5" />
                Daily Usage
              </CardTitle>
              <CardDescription>
                Document generation limit for today
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Progress
                value={stats?.daily_generations_used || 0}
                max={(stats?.daily_generations_used || 0) + (stats?.daily_generations_left || 0)}
                variant={dailyProgress > 80 ? 'warning' : dailyProgress > 50 ? 'default' : 'success'}
                showLabel
                className="mb-2"
              />
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>{stats?.daily_generations_used || 0} used</span>
                <span>{stats?.daily_generations_left || 0} remaining</span>
              </div>
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChartBarIcon className="w-5 h-5" />
                Monthly Tokens
              </CardTitle>
              <CardDescription>
                Token usage for this billing cycle
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Progress
                value={stats?.monthly_tokens_used || 0}
                max={stats?.monthly_tokens_limit || 100000}
                variant={monthlyProgress > 80 ? 'danger' : monthlyProgress > 50 ? 'warning' : 'success'}
                showLabel
                className="mb-2"
              />
              {stats?.tier === 'free' && monthlyProgress > 80 && (
                <div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    You're approaching your monthly limit. Consider upgrading for unlimited usage.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Documents */}
        <Card variant="glass">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Documents</CardTitle>
              <CardDescription>
                Your latest generated documents
              </CardDescription>
            </div>
            <Link href="/">
              <Button variant="outline" size="sm">
                <PlusIcon className="w-4 h-4" />
                Create New
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <div className="text-center py-12">
                <DocumentTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No documents yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Get started by creating your first document
                </p>
                <Link href="/">
                  <Button variant="primary">
                    <PlusIcon className="w-4 h-4" />
                    Create Document
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => {
                  const template = getTemplateDisplay(doc.template);
                  return (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-4 rounded-xl border border-white/20 dark:border-white/10 bg-white/30 dark:bg-white/5 hover:bg-white/40 dark:hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-r ${template.color} flex items-center justify-center text-white text-xs font-bold`}>
                          {template.badge}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 dark:text-white truncate">
                            {doc.title}
                          </h3>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <ClockIcon className="w-4 h-4" />
                              {formatDate(doc.created_at)}
                            </span>
                            {doc.word_count && (
                              <span>{doc.word_count.toLocaleString()} words</span>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <Badge 
                            variant={
                              doc.status === 'completed' ? 'success' : 
                              doc.status === 'generating' ? 'warning' : 'destructive'
                            }
                          >
                            {doc.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Link href={`/doc/${doc.id}`}>
                          <Button variant="ghost" size="sm">
                            <EyeIcon className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteDocument(doc.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}