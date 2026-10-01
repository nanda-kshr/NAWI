'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch, useAuth } from '@/components/auth-context';

interface ReportData {
  report: Record<string, unknown>;
  session: Record<string, unknown> | null;
  results: Array<Record<string, unknown>>;
  instrument: Record<string, unknown> | null;
}

const statusBadge = (s: string) => {
  const cls: Record<string, string> = { pass: 'bg-green-100 text-green-700', fail: 'bg-red-100 text-red-700', pending: 'bg-amber-100 text-amber-700', not_applicable: 'bg-slate-100 text-slate-600' };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cls[s] ?? 'bg-slate-100 text-slate-600'}`}>{s.toUpperCase()}</span>;
};

export default function ReportDetailPage() {
  const { id } = useParams() as { id: string };
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const load = () => apiFetch(`/api/reports/${id}`).then(r => r.json()).then(setData).finally(() => setLoading(false));
  useEffect(() => { load(); }, [id]);

  const doAction = async (action: string) => {
    setActionLoading(true);
    const res = await apiFetch(`/api/reports/${id}`, { method: 'PATCH', body: JSON.stringify({ action }) });
    if (!res.ok) { alert((await res.json()).error); } else { await load(); }
    setActionLoading(false);
  };

  if (loading) return <div className="p-12 text-center text-slate-400">Loading report...</div>;
  if (!data) return <div className="p-12 text-center text-red-500">Report not found</div>;

  const report = data.report;
  const inst = data.instrument;
  const sess = data.session;
  const envCond = sess?.environmentalConditions as Record<string, unknown> | undefined;
  const canSignReviewer = ['reviewer', 'admin'].includes(user?.role ?? '') && !report.reviewerSignedAt;
  const canSignApprover = ['approver', 'admin'].includes(user?.role ?? '') && report.reviewerSignedAt && !report.approverSignedAt;
  const isFinalized = report.status === 'finalized';

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => router.back()} className="text-sm text-slate-500 hover:text-slate-700 mb-1">← Back</button>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900 font-mono">{String(report.reportNumber)}</h2>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Rev. {String(report.revisionNumber)}</span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${isFinalized ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
              {String(report.status).toUpperCase()}
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">OIML R76 Type Evaluation Report · {String(report.standardVersionId)}</p>
        </div>
        <div className="flex gap-2">
          <a href={`/api/reports/${id}/html`} target="_blank" rel="noreferrer"
            className="border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            📄 PDF Preview
          </a>
          {canSignReviewer && (
            <button onClick={() => doAction('sign_reviewer')} disabled={actionLoading}
              className="bg-violet-500 hover:bg-violet-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              🔍 Sign as Reviewer
            </button>
          )}
          {canSignApprover && (
            <button onClick={() => doAction('sign_approver')} disabled={actionLoading}
              className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              ✅ Approve & Finalize
            </button>
          )}
        </div>
      </div>

      {/* Instrument details */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-3 text-sm uppercase tracking-wide">Instrument Details</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
            {[
              ['Manufacturer', inst?.manufacturer], ['Model', inst?.model],
              ['Serial Number', inst?.serialNumber], ['Accuracy Class', `Class ${inst?.accuracyClass}`],
              ['Max Capacity', `${inst?.maxCapacity} kg`], ['Scale Interval (e)', `${inst?.verificationScaleInterval} kg`],
              ['Instrument ID', report.instrumentId], ['Standard', report.standardVersionId],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex gap-2">
                <span className="text-xs text-slate-500 w-32 flex-shrink-0 font-medium">{label}:</span>
                <span className="text-slate-900 text-xs">{value ? String(value) : '—'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Conclusion */}
        <div className={`rounded-xl border-2 p-5 flex flex-col items-center justify-center text-center ${report.overallConclusion === 'approved' ? 'border-green-400 bg-green-50' : report.overallConclusion === 'rejected' ? 'border-red-400 bg-red-50' : 'border-amber-400 bg-amber-50'}`}>
          <div className="text-3xl mb-2">{report.overallConclusion === 'approved' ? '✅' : report.overallConclusion === 'rejected' ? '❌' : '⚠️'}</div>
          <div className="font-bold text-sm text-slate-800 uppercase">{String(report.overallConclusion ?? 'PENDING')}</div>
          {report.deviations && <div className="text-xs text-slate-600 mt-2 italic">{String(report.deviations).slice(0, 100)}</div>}
        </div>
      </div>

      {/* Environmental Conditions */}
      {envCond && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-3 text-sm uppercase tracking-wide">Environmental Conditions</h3>
          <div className="grid grid-cols-5 gap-4 text-center">
            {[
              ['Temperature', `${envCond.temperature} °C`],
              ['Humidity', `${envCond.humidity} %RH`],
              ['Pressure', envCond.pressure ? `${envCond.pressure} hPa` : '—'],
              ['Voltage', envCond.supplyVoltage ? `${envCond.supplyVoltage} V` : '—'],
              ['Laboratory', envCond.laboratory ?? '—'],
            ].map(([label, value]) => (
              <div key={String(label)} className="bg-slate-50 rounded-lg p-3">
                <div className="text-xs text-slate-500 mb-1">{label}</div>
                <div className="font-mono font-semibold text-slate-900 text-sm">{String(value)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Results table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Test Results</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Test Module</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Standard Reference</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Result</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Key Calculation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.results.map((r) => {
              const calcs = (r.calculations as Record<string, unknown>[]) ?? [];
              const firstCalc = calcs[0] as Record<string, unknown> | undefined;
              return (
                <tr key={String(r.testModuleId)} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-sm text-slate-900">{String(r.testModuleName)}</td>
                  <td className="px-5 py-3 text-xs text-slate-500">{String(r.standardReference ?? '—')}</td>
                  <td className="px-5 py-3">{statusBadge(String(r.status))}</td>
                  <td className="px-5 py-3">
                    {firstCalc ? (
                      <div className="text-xs">
                        <span className="font-mono text-slate-600">{String(firstCalc.formula ?? '').split(';')[0]}</span>
                        <span className="ml-2 font-semibold text-slate-900">= {typeof firstCalc.result === 'number' ? (firstCalc.result as number).toFixed(4) : String(firstCalc.result)}</span>
                        {firstCalc.permissibleError !== undefined && (
                          <span className="ml-2 text-slate-400">| MPE: ±{String(firstCalc.permissibleError)}</span>
                        )}
                      </div>
                    ) : <span className="text-slate-400 text-xs">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Signatures */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-4 text-sm uppercase tracking-wide">Signatures</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { role: 'Technician', name: report.technicianName, sig: report.technicianSignature, signedAt: report.technicianSignedAt },
            { role: 'Reviewer', name: report.reviewerName, sig: report.reviewerSignature, signedAt: report.reviewerSignedAt },
            { role: 'Approver', name: report.approverName, sig: report.approverSignature, signedAt: report.approverSignedAt },
          ].map(({ role, name, sig, signedAt }) => (
            <div key={role} className={`border rounded-lg p-4 ${signedAt ? 'border-green-300 bg-green-50' : 'border-slate-200'}`}>
              <div className="text-xs font-semibold text-slate-500 uppercase mb-2">{role}</div>
              <div className="font-medium text-slate-900 text-sm">{name ? String(name) : <span className="text-slate-400 italic">Pending</span>}</div>
              {sig && <div className="text-xs text-slate-600 mt-1 italic">Signed: {String(sig)}</div>}
              {signedAt && <div className="text-xs text-slate-400 mt-0.5">{new Date(String(signedAt)).toLocaleDateString('en-GB')}</div>}
              {!signedAt && <div className="text-xs text-amber-600 mt-1">⏳ Awaiting signature</div>}
            </div>
          ))}
        </div>
      </div>

      {report.remarks && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <h3 className="font-semibold text-amber-800 mb-2 text-sm">Remarks</h3>
          <p className="text-sm text-amber-900">{String(report.remarks)}</p>
        </div>
      )}
    </div>
  );
}
