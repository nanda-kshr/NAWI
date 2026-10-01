'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/components/auth-context';

interface Session {
  _id: string;
  sessionId: string;
  instrumentId: string;
  status: string;
  overallResult: string;
  technicianId: string;
  standardVersionId: string;
  createdAt: string;
  submittedAt?: string;
}

const statusColors: Record<string, string> = {
  pass: 'text-green-700 bg-green-100', fail: 'text-red-700 bg-red-100',
  pending: 'text-amber-700 bg-amber-100', approved: 'text-green-700 bg-green-100',
  in_progress: 'text-blue-700 bg-blue-100', pending_review: 'text-amber-700 bg-amber-100',
  under_review: 'text-violet-700 bg-violet-100', rejected: 'text-red-700 bg-red-100',
  draft: 'text-slate-600 bg-slate-100',
};

export default function TestSessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const router = useRouter();

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    const res = await apiFetch(`/api/test-sessions?${params}`);
    const data = await res.json();
    setSessions(data.sessions ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Test Sessions</h2>
          <p className="text-sm text-slate-500">{total} session{total !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/test-sessions/new" className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2 rounded-lg">
          + New Test Session
        </Link>
      </div>

      <div className="flex gap-3">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500">
          <option value="">All Status</option>
          {['draft', 'in_progress', 'pending_review', 'under_review', 'approved', 'rejected', 'completed'].map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">🔬</div>
            <div className="text-slate-600">No test sessions found</div>
            <Link href="/test-sessions/new" className="inline-block mt-4 text-sm text-amber-600 font-semibold hover:text-amber-700">Start a test →</Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Session ID</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Instrument</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Standard</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Result</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.map(s => (
                <tr key={s._id} onClick={() => router.push(`/test-sessions/${s.sessionId}`)} className="hover:bg-amber-50/50 cursor-pointer transition-colors">
                  <td className="px-5 py-3.5 font-mono text-sm font-semibold text-amber-700">{s.sessionId}</td>
                  <td className="px-5 py-3.5 font-mono text-sm text-slate-700">{s.instrumentId}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-500">{s.standardVersionId}</td>
                  <td className="px-5 py-3.5"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[s.status] ?? 'bg-slate-100 text-slate-600'}`}>{s.status.replace(/_/g, ' ')}</span></td>
                  <td className="px-5 py-3.5"><span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusColors[s.overallResult] ?? 'bg-slate-100 text-slate-600'}`}>{s.overallResult}</span></td>
                  <td className="px-5 py-3.5 text-xs text-slate-400">{new Date(s.createdAt).toLocaleDateString('en-GB')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
