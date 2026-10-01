'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth-context';

export default function LoginPage() {
  const { login, user } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) router.push('/dashboard'); }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role: string) => {
    const creds: Record<string, [string, string]> = {
      admin: ['admin@nawi.demo', 'demo1234'],
      technician: ['tech@nawi.demo', 'demo1234'],
      reviewer: ['reviewer@nawi.demo', 'demo1234'],
      approver: ['approver@nawi.demo', 'demo1234'],
    };
    const [e, p] = creds[role] ?? ['', ''];
    setEmail(e); setPassword(p);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 to-slate-800 p-12 flex-col justify-between border-r border-slate-700">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white font-bold text-xl">N</div>
            <div>
              <div className="text-white font-bold text-lg">NAWI Platform</div>
              <div className="text-slate-400 text-sm">OIML R 76 Type Evaluation</div>
            </div>
          </div>
          <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
            Legal Metrology<br />
            <span className="text-amber-400">Automation</span>
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed max-w-md">
            Replace manual spreadsheets with a fully automated OIML R76 type evaluation workflow —
            from instrument registration to digitally signed reports.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            { icon: '🔬', label: 'Automated Tests', desc: 'OIML R76 compliant' },
            { icon: '📊', label: 'Auto Calculations', desc: 'Rules engine driven' },
            { icon: '✅', label: 'Auto PASS/FAIL', desc: 'Zero manual errors' },
            { icon: '📄', label: 'Instant Reports', desc: 'PDF & DOCX ready' },
          ].map(f => (
            <div key={f.label} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <div className="text-2xl mb-2">{f.icon}</div>
              <div className="text-white text-sm font-semibold">{f.label}</div>
              <div className="text-slate-400 text-xs">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white font-bold">N</div>
            <div className="text-white font-bold text-xl">NAWI Platform</div>
          </div>

          <h3 className="text-2xl font-bold text-white mb-2">Sign in</h3>
          <p className="text-slate-400 mb-8">Access your OIML evaluation workspace</p>

          {/* Demo mode quick login */}
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <div className="text-amber-400 text-xs font-semibold mb-3 flex items-center gap-2">
              🔬 DEMO MODE — Quick Login
            </div>
            <div className="grid grid-cols-2 gap-2">
              {['admin', 'technician', 'reviewer', 'approver'].map(role => (
                <button
                  key={role}
                  onClick={() => fillDemo(role)}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-2 rounded-lg transition-colors capitalize border border-slate-700 text-left"
                >
                  {role === 'admin' ? '👑' : role === 'technician' ? '🔬' : role === 'reviewer' ? '🔍' : '✅'} {role}
                </button>
              ))}
            </div>
            <div className="text-slate-500 text-xs mt-2">Password: demo1234 (auto-filled above)</div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email address</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="user@nawi.demo"
                className="w-full bg-slate-800 border border-slate-600 text-white placeholder-slate-500 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                required placeholder="••••••••"
                className="w-full bg-slate-800 border border-slate-600 text-white placeholder-slate-500 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
            >
              {loading ? 'Signing in...' : 'Sign in to NAWI Platform'}
            </button>
          </form>

          <p className="text-slate-600 text-xs text-center mt-8">
            NAWI Platform v1.0 — OIML R 76-1:2006 Type Evaluation System
          </p>
        </div>
      </div>
    </div>
  );
}
