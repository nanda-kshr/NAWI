'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/components/auth-context';

export default function NewTestSessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [instrumentId, setInstrumentId] = useState(searchParams.get('instrumentId') ?? '');
  const [instruments, setInstruments] = useState<Array<{ instrumentId: string; model: string; manufacturer: string; accuracyClass: string }>>([]);
  const [envCond, setEnvCond] = useState({ temperature: '', humidity: '', pressure: '', supplyVoltage: '', frequency: '', laboratory: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/api/instruments?limit=100').then(r => r.json()).then(d => setInstruments(d.instruments ?? []));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!instrumentId) { setError('Select an instrument'); return; }
    setLoading(true);
    try {
      const res = await apiFetch('/api/test-sessions', {
        method: 'POST',
        body: JSON.stringify({
          instrumentId,
          environmentalConditions: {
            temperature: parseFloat(envCond.temperature),
            humidity: parseFloat(envCond.humidity),
            pressure: envCond.pressure ? parseFloat(envCond.pressure) : undefined,
            supplyVoltage: envCond.supplyVoltage ? parseFloat(envCond.supplyVoltage) : undefined,
            frequency: envCond.frequency ? parseFloat(envCond.frequency) : undefined,
            laboratory: envCond.laboratory,
            recordedAt: new Date().toISOString(),
          },
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Failed'); }
      const data = await res.json();
      router.push(`/test-sessions/${data.session.sessionId}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-sm text-slate-500 hover:text-slate-700 mb-2">← Back</button>
        <h2 className="text-xl font-bold text-slate-900">Start New Test Session</h2>
        <p className="text-sm text-slate-500">Select instrument and record environmental conditions</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4 text-sm uppercase tracking-wide">Select Instrument</h3>
          <select
            value={instrumentId} onChange={e => setInstrumentId(e.target.value)} required
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500"
          >
            <option value="">— Select instrument —</option>
            {instruments.map(i => (
              <option key={i.instrumentId} value={i.instrumentId}>
                {i.instrumentId} · {i.manufacturer} {i.model} (Class {i.accuracyClass})
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4 text-sm uppercase tracking-wide">Environmental Conditions</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { k: 'temperature', label: 'Temperature', unit: '°C', required: true },
              { k: 'humidity', label: 'Relative Humidity', unit: '%RH', required: true },
              { k: 'pressure', label: 'Atmospheric Pressure', unit: 'hPa' },
              { k: 'supplyVoltage', label: 'Supply Voltage', unit: 'V' },
              { k: 'frequency', label: 'Supply Frequency', unit: 'Hz' },
              { k: 'laboratory', label: 'Laboratory / Room', unit: '' },
            ].map(f => (
              <div key={f.k}>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  {f.label}{f.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <div className="relative">
                  <input
                    type={f.unit ? 'number' : 'text'}
                    step="any"
                    value={envCond[f.k as keyof typeof envCond]}
                    onChange={e => setEnvCond(v => ({ ...v, [f.k]: e.target.value }))}
                    required={f.required}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500 pr-12"
                  />
                  {f.unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">{f.unit}</span>}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 p-3 bg-amber-50 rounded-lg text-xs text-amber-700">
            ℹ️ Test plan is automatically determined based on instrument accuracy class and OIML R76-1:2006 requirements.
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-lg">{error}</div>}

        <button type="submit" disabled={loading} className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors">
          {loading ? 'Creating session...' : 'Create Test Session →'}
        </button>
      </form>
    </div>
  );
}
