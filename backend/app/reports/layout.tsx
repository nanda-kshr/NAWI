'use client';
import { AuthProvider } from '@/components/auth-context';
import AppShell from '@/components/app-shell';

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider><AppShell>{children}</AppShell></AuthProvider>;
}
