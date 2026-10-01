'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/components/auth-context';

interface Report {
  _id: string;
  reportNumber: string;
  revisionNumber: number;
  instrumentId: string;
  status: string;
  overallConclusion: string;
  technicianName: string;
  approverName?: string;
  createdAt: string;
  lockedAt?: string;
}

const statusBadge = (s: string) => {
  const cls: Record<string, string> = { finalized: 'bg-green-100 text-green-700', draft: 'bg-amber-100 text-amber-700', superseded: 'bg-slate-100 text-slate-500' };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls[s] ?? 'bg-slate-100 text-slate-600'}`}>{s}</span>;
};

const conclusionBadge = (c: string) => {
  const cls: Record<string, string> = { approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700', conditional: 'bg-amber-100 text-amber-700' };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cls[c] ?? 'bg-slate-100 text-slate-600'}`}>{c}</span>;
};

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    const res = await apiFetch(`/api/reports?${params}`);
    const data = await res.json();
    setReports(data.reports ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  };

  useEffect(() => { load(); }, [search]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Report Repository</h2>
          <p className="text-sm text-slate-500">{total} report{total !== 1 ? 's' : ''} generated</p>
        </div>
      </div>

      <input
        type="text" placeholder="Search by report number, instrument ID..."
        value={search} onChange={e => setSearch(e.target.value)}
        className="border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-amber-500 w-80"
      />

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading reports...</div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">📄</div>
            <div className="text-slate-600 font-medium">No reports yet</div>
            <div className="text-slate-400 text-sm mt-1">Reports are generated from approved test sessions</div>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Report Number</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Instrument</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Conclusion</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Technician</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reports.map(r => (
                <tr key={r._id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-mono text-sm font-semibold text-amber-700">{r.reportNumber}</div>
                    <div className="text-xs text-slate-400">Rev. {r.revisionNumber}</div>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-sm text-slate-700">{r.instrumentId}</td>
                  <td className="px-5 py-3.5">{statusBadge(r.status)}</td>
                  <td className="px-5 py-3.5">{r.overallConclusion ? conclusionBadge(r.overallConclusion) : '—'}</td>
                  <td className="px-5 py-3.5 text-sm text-slate-700">{r.technicianName}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-400">{new Date(r.createdAt).toLocaleDateString('en-GB')}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2">
                      <Link href={`/reports/${r.reportNumber}`} className="text-xs text-amber-600 hover:text-amber-700 font-medium">View</Link>
                      <a href={`/api/reports/${r.reportNumber}/html`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:text-blue-700 font-medium">PDF Preview</a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
