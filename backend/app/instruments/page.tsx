'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/components/auth-context';
import { useSearchParams, useRouter } from 'next/navigation';

interface Instrument {
  _id: string;
  instrumentId: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  accuracyClass: string;
  maxCapacity: number;
  verificationScaleInterval: number;
  status: string;
  createdAt: string;
}

const statusBadge = (s: string) => {
  const cls: Record<string, string> = { active: 'bg-green-100 text-green-700', under_test: 'bg-amber-100 text-amber-700', archived: 'bg-slate-100 text-slate-500' };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls[s] ?? 'bg-slate-100 text-slate-600'}`}>{s.replace(/_/g, ' ')}</span>;
};

export default function InstrumentsPage() {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const router = useRouter();

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    const res = await apiFetch(`/api/instruments?${params}`);
    const data = await res.json();
    setInstruments(data.instruments ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  };

  useEffect(() => { load(); }, [search, statusFilter]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Instruments</h2>
          <p className="text-sm text-slate-500">{total} registered instrument{total !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/instruments/new" className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          + Register Instrument
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input
          type="text" placeholder="Search ID, serial, manufacturer, model..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-amber-500 w-72"
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="under_test">Under Test</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading instruments...</div>
        ) : instruments.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">⚖️</div>
            <div className="text-slate-600 font-medium">No instruments found</div>
            <div className="text-slate-400 text-sm mt-1">Register your first instrument to get started</div>
            <Link href="/instruments/new" className="inline-block mt-4 bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-600">Register Instrument</Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Instrument ID</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Manufacturer / Model</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Serial No.</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Class</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Max / e</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {instruments.map(inst => (
                <tr
                  key={inst._id}
                  onClick={() => router.push(`/instruments/${inst.instrumentId}`)}
                  className="hover:bg-amber-50/50 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-sm font-semibold text-amber-700">{inst.instrumentId}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="text-sm font-medium text-slate-900">{inst.manufacturer}</div>
                    <div className="text-xs text-slate-500">{inst.model}</div>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-sm text-slate-700">{inst.serialNumber}</td>
                  <td className="px-5 py-3.5">
                    <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded">Class {inst.accuracyClass}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="text-sm text-slate-900">{inst.maxCapacity} kg</div>
                    <div className="text-xs text-slate-400">e = {inst.verificationScaleInterval} kg</div>
                  </td>
                  <td className="px-5 py-3.5">{statusBadge(inst.status)}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-400">
                    {new Date(inst.createdAt).toLocaleDateString('en-GB')}
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
