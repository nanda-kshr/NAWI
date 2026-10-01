'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/components/auth-context';

interface InstrumentData {
  instrument: Record<string, unknown>;
  sessions: Array<{ sessionId: string; status: string; overallResult: string; createdAt: string; standardVersionId: string }>;
}

const statusColors: Record<string, string> = {
  pass: 'text-green-700 bg-green-100', fail: 'text-red-700 bg-red-100',
  pending: 'text-amber-700 bg-amber-100', approved: 'text-green-700 bg-green-100',
  in_progress: 'text-blue-700 bg-blue-100', pending_review: 'text-amber-700 bg-amber-100',
  under_review: 'text-violet-700 bg-violet-100', rejected: 'text-red-700 bg-red-100',
};

function Row({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="flex py-2.5 border-b border-slate-100 last:border-0">
      <span className="w-48 text-xs font-semibold text-slate-500 uppercase tracking-wide flex-shrink-0">{label}</span>
      <span className="text-sm text-slate-900">{value !== undefined && value !== null && value !== '' ? String(value) : '—'}</span>
    </div>
  );
}

export default function InstrumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [data, setData] = useState<InstrumentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/api/instruments/${id}`).then(r => r.json()).then(setData).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-12 text-center text-slate-400">Loading instrument...</div>;
  if (!data?.instrument) return <div className="p-12 text-center text-red-500">Instrument not found</div>;

  const inst = data.instrument as Record<string, unknown>;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => router.back()} className="text-sm text-slate-500 hover:text-slate-700 mb-2 flex items-center gap-1">← Back</button>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900">{String(inst.manufacturer)} {String(inst.model)}</h2>
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded">Class {String(inst.accuracyClass)}</span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[String(inst.status)] ?? 'bg-slate-100 text-slate-600'}`}>
              {String(inst.status).replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1 font-mono">{String(inst.instrumentId)} · SN: {String(inst.serialNumber)}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/test-sessions/new?instrumentId=${inst.instrumentId}`}
            className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            + Start Test
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* QR Code */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4 text-sm">Instrument QR Code</h3>
          {inst.qrCode ? (
            <div className="text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={String(inst.qrCode)} alt="QR Code" className="w-40 h-40 mx-auto border-2 border-slate-200 rounded-lg p-2" />
              <p className="text-xs text-slate-400 mt-3">Scan to open instrument profile</p>
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.download = `QR-${inst.instrumentId}.png`;
                  link.href = String(inst.qrCode);
                  link.click();
                }}
                className="mt-3 text-xs text-amber-600 hover:text-amber-700 font-medium"
              >
                ↓ Download QR Label
              </button>
            </div>
          ) : <div className="text-slate-400 text-sm">No QR code generated</div>}
        </div>

        {/* Metrological Summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4 text-sm">Metrological Characteristics</h3>
          <div className="space-y-1">
            <Row label="Max Capacity" value={`${inst.maxCapacity} kg`} />
            <Row label="Min Capacity" value={`${inst.minCapacity} kg`} />
            <Row label="Scale Interval (e)" value={`${inst.verificationScaleInterval} kg`} />
            <Row label="Display Res. (d)" value={`${inst.displayResolution} kg`} />
            <Row label="Intervals (n)" value={inst.numberOfIntervals} />
            <Row label="Accuracy Class" value={`Class ${inst.accuracyClass}`} />
          </div>
        </div>

        {/* Full specifications */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 col-span-2">
          <h3 className="font-semibold text-slate-800 mb-4 text-sm">Full Specifications</h3>
          <div className="grid grid-cols-2 gap-x-8">
            <div>
              <Row label="Instrument Type" value={inst.instrumentType} />
              <Row label="Load Cell" value={inst.loadCellInfo} />
              <Row label="Software Version" value={inst.softwareVersion} />
              <Row label="Firmware Version" value={inst.firmwareVersion} />
              <Row label="Power Supply" value={inst.powerSupply} />
            </div>
            <div>
              <Row label="Temp. Range" value={`${inst.temperatureMin}°C to ${inst.temperatureMax}°C`} />
              <Row label="Humidity Range" value={`${inst.humidityMin}%RH to ${inst.humidityMax}%RH`} />
              <Row label="Operating Conditions" value={inst.operatingConditions} />
              <Row label="Tech. Specifications" value={inst.technicalSpecifications} />
            </div>
          </div>
        </div>
      </div>

      {/* Test History */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Test Session History</h3>
          <span className="text-xs text-slate-400">{data.sessions.length} session{data.sessions.length !== 1 ? 's' : ''}</span>
        </div>
        {data.sessions.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-slate-400 text-sm">No test sessions yet</div>
            <Link href={`/test-sessions/new?instrumentId=${inst.instrumentId}`}
              className="inline-block mt-3 text-sm text-amber-600 font-semibold hover:text-amber-700">
              Start first test →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.sessions.map(s => (
              <Link key={s.sessionId} href={`/test-sessions/${s.sessionId}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 font-mono">{s.sessionId}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{s.standardVersionId} · {new Date(s.createdAt).toLocaleDateString('en-GB')}</div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[s.status] ?? 'bg-slate-100 text-slate-600'}`}>{s.status.replace(/_/g, ' ')}</span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusColors[s.overallResult] ?? 'bg-slate-100 text-slate-600'}`}>{s.overallResult}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
