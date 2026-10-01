'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch, useAuth } from '@/components/auth-context';

interface SessionData {
  session: Record<string, unknown>;
  results: Array<{
    testModuleId: string;
    testModuleName: string;
    standardReference: string;
    status: string;
    observations: Array<{ label: string; value: unknown; unit: string }>;
    calculations: Array<{
      formula: string;
      result: number;
      permissibleError: number;
      actualError: number;
      passFail: string;
      notes?: string;
    }>;
    notes: string;
  }>;
  instrument: Record<string, unknown>;
}

interface RulesData {
  modules: Array<{
    id: string;
    name: string;
    standardReference: string;
    description: string;
    observationFields: Array<{ key: string; label: string; unit: string; type: string; required: boolean; description?: string }>;
  }>;
}

const statusColors: Record<string, string> = {
  pass: 'text-green-700 bg-green-100 border-green-200',
  fail: 'text-red-700 bg-red-100 border-red-200',
  pending: 'text-amber-700 bg-amber-100 border-amber-200',
  not_applicable: 'text-slate-600 bg-slate-100 border-slate-200',
};

const StatusBadge = ({ status }: { status: string }) => (
  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${statusColors[status] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
    {status.replace(/_/g, ' ').toUpperCase()}
  </span>
);

export default function TestSessionDetailPage() {
  const { id } = useParams() as { id: string };
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<SessionData | null>(null);
  const [rules, setRules] = useState<RulesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [observations, setObservations] = useState<Record<string, Record<string, string>>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [expandedCalc, setExpandedCalc] = useState<string | null>(null);

  const load = async () => {
    const [sessionRes, rulesRes] = await Promise.all([
      apiFetch(`/api/test-sessions/${id}`),
      apiFetch('/api/rules'),
    ]);
    setData(await sessionRes.json());
    setRules(await rulesRes.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const submitObservations = async (moduleId: string) => {
    setSubmitting(moduleId);
    const obs: Record<string, number | string> = {};
    for (const [k, v] of Object.entries(observations[moduleId] ?? {})) {
      obs[k] = isNaN(Number(v)) ? v : Number(v);
    }
    try {
      const res = await apiFetch(`/api/test-sessions/${id}`, {
        method: 'POST',
        body: JSON.stringify({ testModuleId: moduleId, observations: obs }),
      });
      if (!res.ok) { const d = await res.json(); alert(d.error ?? 'Submission failed'); return; }
      await load();
      setActiveModule(null);
    } finally {
      setSubmitting(null);
    }
  };

  const sessionAction = async (action: string) => {
    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/test-sessions/${id}`, { method: 'PATCH', body: JSON.stringify({ action }) });
      if (!res.ok) { const d = await res.json(); alert(d.error); return; }
      await load();
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Loading test session...</div>;
  if (!data) return <div className="text-red-500 p-8">Session not found</div>;

  const { session, results, instrument } = data;
  const sess = session as Record<string, unknown>;
  const inst = instrument as Record<string, unknown>;
  const envCond = sess.environmentalConditions as Record<string, unknown> | undefined;
  const testPlan = sess.testPlan as string[] | undefined ?? [];
  const canSubmit = sess.status === 'in_progress' && user?.role === 'technician';
  const canReview = ['pending_review', 'under_review'].includes(String(sess.status)) && ['reviewer', 'admin'].includes(user?.role ?? '');
  const canApprove = String(sess.status) === 'under_review' && ['approver', 'admin'].includes(user?.role ?? '');
  const isLocked = ['approved', 'completed'].includes(String(sess.status));

  const passedCount = results.filter(r => r.status === 'pass').length;
  const failedCount = results.filter(r => r.status === 'fail').length;
  const pendingCount = results.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => router.back()} className="text-sm text-slate-500 hover:text-slate-700 mb-1">← Back</button>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900 font-mono">{String(sess.sessionId)}</h2>
            <StatusBadge status={String(sess.status)} />
            <StatusBadge status={String(sess.overallResult)} />
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {String(inst?.manufacturer ?? '')} {String(inst?.model ?? '')} · {String(sess.instrumentId)} · {String(sess.standardVersionId)}
          </p>
        </div>
        <div className="flex gap-2">
          {canSubmit && (
            <button onClick={() => sessionAction('submit')} disabled={actionLoading || pendingCount > 0}
              className="bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              title={pendingCount > 0 ? 'Complete all tests before submitting' : ''}>
              {actionLoading ? '...' : 'Submit for Review →'}
            </button>
          )}
          {canReview && (
            <button onClick={() => sessionAction('review')} disabled={actionLoading}
              className="bg-violet-500 hover:bg-violet-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              Mark Under Review
            </button>
          )}
          {canApprove && (
            <button onClick={() => sessionAction('approve')} disabled={actionLoading}
              className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              ✅ Approve
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-800 text-sm">Test Progress</h3>
          <div className="flex gap-4 text-xs">
            <span className="text-green-700 font-semibold">✓ {passedCount} Passed</span>
            <span className="text-red-700 font-semibold">✗ {failedCount} Failed</span>
            <span className="text-amber-700 font-semibold">◷ {pendingCount} Pending</span>
          </div>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
          {results.length > 0 && results.map(r => (
            <div key={r.testModuleId} className={`flex-1 h-full transition-all ${r.status === 'pass' ? 'bg-green-500' : r.status === 'fail' ? 'bg-red-500' : 'bg-slate-200'}`} />
          ))}
        </div>
        <div className="text-xs text-slate-400 mt-1">{results.length - pendingCount} of {results.length} modules complete</div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Left: test module list */}
        <div className="col-span-1 space-y-2">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Test Modules</h3>
            </div>
            {results.map(result => {
              const isActive = activeModule === result.testModuleId;
              return (
                <button
                  key={result.testModuleId}
                  onClick={() => setActiveModule(isActive ? null : result.testModuleId)}
                  disabled={isLocked}
                  className={`w-full flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-0 text-left transition-colors ${isActive ? 'bg-amber-50 border-l-2 border-l-amber-500' : 'hover:bg-slate-50'}`}
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${result.status === 'pass' ? 'bg-green-500' : result.status === 'fail' ? 'bg-red-500' : 'bg-slate-300'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-slate-900 truncate">{result.testModuleName}</div>
                    <div className="text-xs text-slate-400">{result.standardReference?.split(' ').slice(-2).join(' ')}</div>
                  </div>
                  <StatusBadge status={result.status} />
                </button>
              );
            })}
          </div>

          {/* Environmental Conditions */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Environmental Conditions</h3>
            {envCond ? (
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">Temperature</span><span className="font-mono font-medium">{String(envCond.temperature)} °C</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Humidity</span><span className="font-mono font-medium">{String(envCond.humidity)} %RH</span></div>
                {envCond.pressure && <div className="flex justify-between"><span className="text-slate-500">Pressure</span><span className="font-mono font-medium">{String(envCond.pressure)} hPa</span></div>}
                {envCond.supplyVoltage && <div className="flex justify-between"><span className="text-slate-500">Voltage</span><span className="font-mono font-medium">{String(envCond.supplyVoltage)} V</span></div>}
                {envCond.laboratory && <div className="flex justify-between"><span className="text-slate-500">Lab</span><span className="font-medium text-right">{String(envCond.laboratory)}</span></div>}
              </div>
            ) : <div className="text-xs text-slate-400">No conditions recorded</div>}
          </div>
        </div>

        {/* Right: active module form OR results */}
        <div className="col-span-2 space-y-4">
          {activeModule && (() => {
            const result = results.find(r => r.testModuleId === activeModule);
            const moduleDef = rules?.modules.find(m => m.id === activeModule);
            if (!result || !moduleDef) return null;

            return (
              <div className="bg-white rounded-xl border border-slate-200">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-900">{result.testModuleName}</h3>
                  <p className="text-xs text-slate-500 mt-1">{result.standardReference}</p>
                  {moduleDef.description && <p className="text-xs text-slate-600 mt-1.5 italic">{moduleDef.description}</p>}
                </div>

                {/* Observation entry */}
                {!isLocked && canSubmit && (
                  <div className="px-6 py-5 border-b border-slate-100">
                    <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-4">Enter Observations</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {moduleDef.observationFields.map(field => (
                        <div key={field.key}>
                          <label className="block text-xs font-medium text-slate-600 mb-1.5">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                            {field.unit && <span className="text-slate-400 ml-1">({field.unit})</span>}
                          </label>
                          {field.description && <p className="text-xs text-slate-400 mb-1 italic">{field.description}</p>}
                          <input
                            type={field.type === 'number' ? 'number' : 'text'}
                            step="any"
                            value={observations[activeModule]?.[field.key] ?? ''}
                            onChange={e => setObservations(o => ({
                              ...o,
                              [activeModule]: { ...(o[activeModule] ?? {}), [field.key]: e.target.value },
                            }))}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono"
                          />
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => submitObservations(activeModule)}
                      disabled={submitting === activeModule}
                      className="mt-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
                    >
                      {submitting === activeModule ? 'Calculating...' : '⚡ Submit & Calculate →'}
                    </button>
                  </div>
                )}

                {/* Calculation results */}
                {result.calculations.length > 0 && (
                  <div className="px-6 py-5">
                    <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-4">Calculation Results</h4>
                    <div className="space-y-3">
                      {result.calculations.map((calc, i) => (
                        <div key={i} className={`rounded-lg border p-4 ${calc.passFail === 'pass' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-xs font-mono text-slate-600 italic">{calc.formula}</div>
                            <StatusBadge status={calc.passFail} />
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-xs">
                            <div>
                              <span className="text-slate-500">Result</span>
                              <div className="font-mono font-bold text-slate-900 mt-0.5">{typeof calc.result === 'number' ? calc.result.toFixed(4) : calc.result}</div>
                            </div>
                            {calc.permissibleError !== undefined && (
                              <div>
                                <span className="text-slate-500">Permissible Error (MPE)</span>
                                <div className="font-mono font-bold text-slate-900 mt-0.5">±{typeof calc.permissibleError === 'number' ? calc.permissibleError.toFixed(4) : calc.permissibleError}</div>
                              </div>
                            )}
                            {calc.actualError !== undefined && (
                              <div>
                                <span className="text-slate-500">Actual Error</span>
                                <div className={`font-mono font-bold mt-0.5 ${Math.abs(Number(calc.actualError)) <= Math.abs(Number(calc.permissibleError)) ? 'text-green-700' : 'text-red-700'}`}>
                                  {typeof calc.actualError === 'number' ? calc.actualError.toFixed(4) : calc.actualError}
                                </div>
                              </div>
                            )}
                          </div>
                          {calc.notes && <div className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mt-2 font-mono">{calc.notes}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Prior observations */}
                {result.observations.length > 0 && (
                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Recorded Observations</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {result.observations.map((obs, i) => (
                        <div key={i} className="bg-white border border-slate-200 rounded-lg px-3 py-2">
                          <div className="text-xs text-slate-500 capitalize">{obs.label}</div>
                          <div className="font-mono text-sm font-semibold text-slate-900">{String(obs.value)} {obs.unit}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Summary of all results when no module selected */}
          {!activeModule && (
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">All Test Results</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {results.map(r => (
                  <div key={r.testModuleId} className="px-5 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-medium text-sm text-slate-900">{r.testModuleName}</span>
                        <span className="text-xs text-slate-400 ml-2">{r.standardReference}</span>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                    {r.calculations.length > 0 && (
                      <div className="text-xs text-slate-500 space-y-1">
                        {r.calculations.map((c, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${c.passFail === 'pass' ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span className="font-mono">{c.formula.split(';')[0]}</span>
                            <span className="font-semibold text-slate-700">= {typeof c.result === 'number' ? c.result.toFixed(4) : c.result}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {r.notes && <div className="text-xs text-slate-500 italic mt-1">{r.notes}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
