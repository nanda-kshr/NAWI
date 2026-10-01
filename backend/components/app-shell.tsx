'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './auth-context';
import { useEffect } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/instruments', label: 'Instruments', icon: '⚖️' },
  { href: '/test-sessions', label: 'Test Sessions', icon: '🔬' },
  { href: '/reports', label: 'Reports', icon: '📄' },
  { href: '/equipment', label: 'Equipment', icon: '🛠️' },
  { href: '/audit-log', label: 'Audit Log', icon: '📋' },
  { href: '/users', label: 'Users', icon: '👤', roles: ['admin'] },
];

const roleColors: Record<string, string> = {
  admin: 'bg-violet-100 text-violet-800',
  technician: 'bg-blue-100 text-blue-800',
  reviewer: 'bg-amber-100 text-amber-800',
  approver: 'bg-green-100 text-green-800',
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="text-4xl mb-4">🔬</div>
          <div className="text-white text-lg font-medium">NAWI Platform</div>
          <div className="text-slate-400 text-sm mt-1">Loading...</div>
        </div>
      </div>
    );
  }
  if (!user) return null;

  const visibleNav = navItems.filter(item => !item.roles || item.roles.includes(user.role));

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">N</div>
            <div>
              <div className="text-white font-bold text-sm leading-tight">NAWI Platform</div>
              <div className="text-slate-400 text-xs">OIML R76 Evaluation</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {visibleNav.map(item => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-white text-sm font-medium truncate">{user.name}</div>
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${roleColors[user.role] ?? 'bg-slate-700 text-slate-300'}`}>
                {user.role}
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full text-xs text-slate-400 hover:text-white hover:bg-slate-800 px-3 py-2 rounded-lg transition-colors text-left"
          >
            ← Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-sm font-semibold text-slate-800 capitalize">
              {pathname.split('/')[1]?.replace(/-/g, ' ') || 'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full font-mono">
              OIML R76-1:2006
            </div>
            <Link
              href="/test-sessions/new"
              className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              + New Test
            </Link>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
