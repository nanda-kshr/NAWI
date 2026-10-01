'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/components/auth-context';

interface AuditEntry {
  _id: string;
  action: string;
  entityType: string;
  entityId: string;
  userName: string;
  userRole: string;
  details: Record<string, unknown>;
  timestamp: string;
}

const actionColors: Record<string, string> = {
  LOGIN: 'bg-blue-100 text-blue-700',
  CREATE_INSTRUMENT: 'bg-green-100 text-green-700',
  UPDATE_INSTRUMENT: 'bg-amber-100 text-amber-700',
  CREATE_TEST_SESSION: 'bg-green-100 text-green-700',
  SUBMIT_OBSERVATIONS: 'bg-blue-100 text-blue-700',
  SUBMIT_FOR_REVIEW: 'bg-violet-100 text-violet-700',
  SIGN_REPORT_REVIEWER: 'bg-violet-100 text-violet-700',
  FINALIZE_REPORT: 'bg-green-100 text-green-700',
  APPROVE_SESSION: 'bg-green-100 text-green-700',
  REJECT_SESSION: 'bg-red-100 text-red-700',
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/audit-logs?limit=100')
      .then(r => r.json())
      .then(d => { setLogs(d.logs ?? []); setTotal(d.total ?? 0); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Audit Log</h2>
        <p className="text-sm text-slate-500">{total} entries — append-only audit trail</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? <div className="p-12 text-center text-slate-400">Loading audit log...</div> : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Timestamp</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Action</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Entity</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">User</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map(log => (
                <tr key={log._id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 text-xs font-mono text-slate-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'medium' })}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${actionColors[log.action] ?? 'bg-slate-100 text-slate-600'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="text-xs font-medium text-slate-700">{log.entityType}</div>
                    <div className="text-xs text-slate-400 font-mono">{log.entityId?.slice(0, 20)}</div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="text-sm text-slate-900">{log.userName}</div>
                    <div className="text-xs text-slate-400 capitalize">{log.userRole}</div>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500 font-mono max-w-xs truncate">
                    {JSON.stringify(log.details ?? {})}
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
