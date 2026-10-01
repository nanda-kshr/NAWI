'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/components/auth-context';

interface Equipment {
  _id: string;
  equipmentId: string;
  name: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  capacityRange: string;
  accuracy: string;
  calibrationDate: string;
  calibrationExpiry: string;
  status: string;
  calibrationExpired: boolean;
}

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', manufacturer: '', model: '', serialNumber: '', capacityRange: '', accuracy: '', calibrationDate: '', calibrationExpiry: '' });
  const [saving, setSaving] = useState(false);

  const load = () => apiFetch('/api/equipment').then(r => r.json()).then(d => { setEquipment(d.equipment ?? []); setLoading(false); });
  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await apiFetch('/api/equipment', { method: 'POST', body: JSON.stringify(form) });
    if (res.ok) { await load(); setShowForm(false); setForm({ name: '', manufacturer: '', model: '', serialNumber: '', capacityRange: '', accuracy: '', calibrationDate: '', calibrationExpiry: '' }); }
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Test Equipment</h2>
          <p className="text-sm text-slate-500">Laboratory measurement equipment and calibration status</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2 rounded-lg">
          + Add Equipment
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4 text-sm">Add New Equipment</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { k: 'name', label: 'Equipment Name', required: true },
              { k: 'manufacturer', label: 'Manufacturer' },
              { k: 'model', label: 'Model' },
              { k: 'serialNumber', label: 'Serial Number' },
              { k: 'capacityRange', label: 'Capacity / Range' },
              { k: 'accuracy', label: 'Accuracy' },
              { k: 'calibrationDate', label: 'Calibration Date', type: 'date' },
              { k: 'calibrationExpiry', label: 'Calibration Expiry', type: 'date' },
            ].map(f => (
              <div key={f.k}>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">{f.label}{f.required && <span className="text-red-500 ml-1">*</span>}</label>
                <input type={f.type ?? 'text'} value={form[f.k as keyof typeof form]} onChange={e => setForm(v => ({ ...v, [f.k]: e.target.value }))}
                  required={f.required}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-4">
            <button type="submit" disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-5 py-2 rounded-lg">{saving ? 'Saving...' : 'Add Equipment'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="border border-slate-300 text-slate-600 text-sm font-semibold px-5 py-2 rounded-lg hover:bg-slate-50">Cancel</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? <div className="p-12 text-center text-slate-400">Loading...</div> : equipment.length === 0 ? (
          <div className="p-12 text-center"><div className="text-4xl mb-3">🛠️</div><div className="text-slate-600">No equipment registered</div></div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {['ID', 'Name', 'Manufacturer / Model', 'Range / Accuracy', 'Calibration', 'Status'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {equipment.map(eq => (
                <tr key={eq._id} className={`hover:bg-slate-50 ${eq.calibrationExpired ? 'bg-red-50' : ''}`}>
                  <td className="px-5 py-3.5 font-mono text-xs text-amber-700">{eq.equipmentId}</td>
                  <td className="px-5 py-3.5 font-medium text-sm text-slate-900">{eq.name}</td>
                  <td className="px-5 py-3.5">
                    <div className="text-sm text-slate-700">{eq.manufacturer}</div>
                    <div className="text-xs text-slate-400">{eq.model}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="text-xs text-slate-700">{eq.capacityRange}</div>
                    <div className="text-xs text-slate-400">{eq.accuracy}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="text-xs text-slate-700">Expires: {eq.calibrationExpiry ? new Date(eq.calibrationExpiry).toLocaleDateString('en-GB') : '—'}</div>
                    {eq.calibrationExpired && <div className="text-xs text-red-600 font-semibold mt-0.5">⚠️ EXPIRED</div>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${eq.status === 'active' ? 'bg-green-100 text-green-700' : eq.status === 'expired' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                      {eq.status}
                    </span>
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
