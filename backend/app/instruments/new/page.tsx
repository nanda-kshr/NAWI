'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/components/auth-context';

const classes = ['I', 'II', 'III', 'IIII'];
const types = ['Platform Scale', 'Bench Scale', 'Floor Scale', 'Crane Scale', 'Retail Scale', 'Laboratory Balance', 'Tank/Hopper Scale', 'Railway Scale', 'Belt Weigher', 'Other'];

export default function NewInstrumentPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    manufacturer: '', manufacturerAddress: '', model: '', serialNumber: '',
    instrumentType: 'Platform Scale', accuracyClass: 'III',
    maxCapacity: '', minCapacity: '0', verificationScaleInterval: '', displayResolution: '',
    loadCellInfo: '', softwareVersion: '', firmwareVersion: '',
    temperatureMin: '-10', temperatureMax: '40', humidityMin: '15', humidityMax: '85',
    powerSupply: '', operatingConditions: '', technicalSpecifications: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        ...form,
        maxCapacity: parseFloat(form.maxCapacity),
        minCapacity: parseFloat(form.minCapacity),
        verificationScaleInterval: parseFloat(form.verificationScaleInterval),
        displayResolution: parseFloat(form.displayResolution),
        temperatureMin: parseFloat(form.temperatureMin),
        temperatureMax: parseFloat(form.temperatureMax),
        humidityMin: parseFloat(form.humidityMin),
        humidityMax: parseFloat(form.humidityMax),
      };
      const res = await apiFetch('/api/instruments', { method: 'POST', body: JSON.stringify(payload) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Failed'); }
      const data = await res.json();
      router.push(`/instruments/${data.instrument.instrumentId}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ label, k, type = 'text', unit, required = false, options }: {
    label: string; k: string; type?: string; unit?: string; required?: boolean; options?: string[];
  }) => (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {options ? (
        <select value={form[k as keyof typeof form]} onChange={e => set(k, e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500">
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <div className="relative">
          <input type={type} value={form[k as keyof typeof form]} onChange={e => set(k, e.target.value)} required={required}
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 pr-12" />
          {unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">{unit}</span>}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-sm text-slate-500 hover:text-slate-700 mb-3 flex items-center gap-1.5">← Back</button>
        <h2 className="text-xl font-bold text-slate-900">Register New Instrument</h2>
        <p className="text-sm text-slate-500">Register a NAWI for OIML R76 type evaluation</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Manufacturer */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4 text-sm uppercase tracking-wide">Manufacturer Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Manufacturer Name" k="manufacturer" required />
            <div className="col-span-2"><Field label="Manufacturer Address" k="manufacturerAddress" /></div>
          </div>
        </div>

        {/* Instrument identification */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4 text-sm uppercase tracking-wide">Instrument Identification</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Model" k="model" required />
            <Field label="Serial Number" k="serialNumber" required />
            <Field label="Instrument Type" k="instrumentType" options={types} />
            <Field label="Accuracy Class" k="accuracyClass" options={classes} />
          </div>
        </div>

        {/* Metrological characteristics */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4 text-sm uppercase tracking-wide">Metrological Characteristics</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Maximum Capacity (Max)" k="maxCapacity" type="number" unit="kg" required />
            <Field label="Minimum Capacity (Min)" k="minCapacity" type="number" unit="kg" />
            <Field label="Verification Scale Interval (e)" k="verificationScaleInterval" type="number" unit="kg" required />
            <Field label="Display Resolution (d)" k="displayResolution" type="number" unit="kg" required />
            <Field label="Load Cell Information" k="loadCellInfo" />
          </div>
          {form.verificationScaleInterval && form.maxCapacity && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
              📊 Calculated: n = Max/e = {form.maxCapacity}/{form.verificationScaleInterval} = {Math.floor(parseFloat(form.maxCapacity)/parseFloat(form.verificationScaleInterval))} intervals
            </div>
          )}
        </div>

        {/* Software/Firmware */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4 text-sm uppercase tracking-wide">Software & Operating Conditions</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Software Version" k="softwareVersion" />
            <Field label="Firmware Version" k="firmwareVersion" />
            <Field label="Power Supply" k="powerSupply" />
            <Field label="Temperature Min" k="temperatureMin" type="number" unit="°C" />
            <Field label="Temperature Max" k="temperatureMax" type="number" unit="°C" />
            <Field label="Humidity Min" k="humidityMin" type="number" unit="%RH" />
            <Field label="Humidity Max" k="humidityMax" type="number" unit="%RH" />
            <div className="col-span-2"><Field label="Operating Conditions" k="operatingConditions" /></div>
            <div className="col-span-2"><Field label="Technical Specifications" k="technicalSpecifications" /></div>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-lg">{error}</div>}

        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors">
            {loading ? 'Registering...' : 'Register Instrument & Generate QR'}
          </button>
          <button type="button" onClick={() => router.back()} className="border border-slate-300 text-slate-600 hover:bg-slate-50 font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
