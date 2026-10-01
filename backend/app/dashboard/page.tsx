'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/components/auth-context';

interface DashboardData {
  stats: {
    totalInstruments: number;
    activeInstruments: number;
    sessionsInProgress: number;
    pendingReview: number;
    approvedReports: number;
    totalReports: number;
    failedSessions: number;
  };
  recentActivity: Array<{ action: string; userName: string; entityType: string; timestamp: string }>;
  sessionsByStatus: Array<{ _id: string; count: number }>;
  activityByDay: Array<{ _id: string; count: number }>;
  recentSessions: Array<{ sessionId: string; instrumentId: string; status: string; overallResult: string; createdAt: string }>;
}

const statusColors: Record<string, string> = {
  pass: 'text-green-700 bg-green-100',
  fail: 'text-red-700 bg-red-100',
  pending: 'text-amber-700 bg-amber-100',
  not_determined: 'text-slate-600 bg-slate-100',
  approved: 'text-green-700 bg-green-100',
  in_progress: 'text-blue-700 bg-blue-100',
  pending_review: 'text-amber-700 bg-amber-100',
  under_review: 'text-violet-700 bg-violet-100',
  rejected: 'text-red-700 bg-red-100',
  draft: 'text-slate-600 bg-slate-100',
};

function StatCard({ label, value, icon, color, sublabel }: { label: string; value: number | string; icon: string; color: string; sublabel?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${color}`}>{icon}</div>
      <div>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        <div className="text-sm font-medium text-slate-600">{label}</div>
        {sublabel && <div className="text-xs text-slate-400 mt-0.5">{sublabel}</div>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/api/dashboard')
      .then(r => r.json())
      .then(setData)
      .catch(() => setError('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-slate-500">Loading dashboard...</div>
    </div>
  );

  if (error) return (
    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">{error}</div>
  );

  const stats = data?.stats;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Overview</h2>
          <p className="text-sm text-slate-500 mt-0.5">OIML R76 Type Evaluation Status</p>
        </div>
        <Link href="/instruments/new" className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          + Register Instrument
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Instruments" value={stats?.totalInstruments ?? 0} icon="⚖️" color="bg-blue-100" />
        <StatCard label="Tests In Progress" value={stats?.sessionsInProgress ?? 0} icon="🔬" color="bg-amber-100" />
        <StatCard label="Pending Review" value={stats?.pendingReview ?? 0} icon="🔍" color="bg-violet-100" />
        <StatCard label="Approved Reports" value={stats?.approvedReports ?? 0} icon="✅" color="bg-green-100" />
        <StatCard label="Total Reports" value={stats?.totalReports ?? 0} icon="📄" color="bg-slate-100" />
        <StatCard label="Failed Tests" value={stats?.failedSessions ?? 0} icon="❌" color="bg-red-100" />
        <StatCard label="Active Instruments" value={stats?.activeInstruments ?? 0} icon="🟢" color="bg-emerald-100" />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sessions */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Recent Test Sessions</h3>
            <Link href="/test-sessions" className="text-xs text-amber-600 hover:text-amber-700 font-medium">View all →</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {data?.recentSessions.length === 0 && (
              <div className="px-5 py-8 text-center text-slate-400 text-sm">No test sessions yet</div>
            )}
            {data?.recentSessions.map(s => (
              <Link key={s.sessionId} href={`/test-sessions/${s.sessionId}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 font-mono">{s.sessionId}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{s.instrumentId} · {new Date(s.createdAt).toLocaleDateString('en-GB')}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[s.status] ?? 'bg-slate-100 text-slate-600'}`}>
                    {s.status.replace(/_/g, ' ')}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusColors[s.overallResult] ?? 'bg-slate-100 text-slate-600'}`}>
                    {s.overallResult}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Session status breakdown */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Sessions by Status</h3>
          </div>
          <div className="p-5 space-y-3">
            {data?.sessionsByStatus.map(s => {
              const total = data.sessionsByStatus.reduce((acc, x) => acc + x.count, 0);
              const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
              return (
                <div key={s._id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="capitalize text-slate-600 font-medium">{s._id.replace(/_/g, ' ')}</span>
                    <span className="text-slate-500">{s.count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {(!data?.sessionsByStatus || data.sessionsByStatus.length === 0) && (
              <div className="text-center text-slate-400 text-sm py-6">No session data yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Recent Activity</h3>
          <Link href="/audit-log" className="text-xs text-amber-600 hover:text-amber-700 font-medium">Full audit log →</Link>
        </div>
        <div className="divide-y divide-slate-100">
          {data?.recentActivity.map((a, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3">
              <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">
                {a.userName?.charAt(0) ?? 'S'}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-slate-800">{a.userName ?? 'System'}</span>
                <span className="text-sm text-slate-500"> — </span>
                <span className="text-sm text-slate-700">{a.action.replace(/_/g, ' ').toLowerCase()}</span>
                <span className="text-xs text-slate-400 ml-2">({a.entityType})</span>
              </div>
              <div className="text-xs text-slate-400 whitespace-nowrap">
                {new Date(a.timestamp).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
              </div>
            </div>
          ))}
          {(!data?.recentActivity || data.recentActivity.length === 0) && (
            <div className="px-5 py-8 text-center text-slate-400 text-sm">No activity yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
