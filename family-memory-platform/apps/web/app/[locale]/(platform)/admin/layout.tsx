import type { ReactNode } from 'react';
import { AdminGate } from '@/features/admin/admin-gate';
import { AdminShell } from '@/features/admin/admin-shell';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminGate>
      <div className="rounded-[2rem] border border-indigo-400/20 bg-white/95 p-4 shadow-xl shadow-indigo-950/20 dark:border-indigo-500/25 dark:bg-slate-900/90 sm:p-6">
        <AdminShell showNav={false}>{children}</AdminShell>
      </div>
    </AdminGate>
  );
}
