import type { ReactNode } from 'react';
import { AdminGate } from '@/features/admin/admin-gate';
import { AdminShell } from '@/features/admin/admin-shell';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminGate>
      <div className="-mx-3 rounded-[2rem] border border-indigo-200/50 bg-[linear-gradient(165deg,rgba(238,242,255,0.92)_0%,rgba(248,250,252,0.96)_55%,rgba(241,245,249,0.98)_100%)] px-3 py-5 shadow-inner shadow-indigo-100/40 dark:border-indigo-900/40 dark:bg-[linear-gradient(165deg,rgba(15,23,42,0.96)_0%,rgba(30,27,75,0.35)_45%,rgba(15,23,42,0.98)_100%)] dark:shadow-indigo-950/30 sm:-mx-4 sm:px-4 md:-mx-8 md:px-8">
        <AdminShell>{children}</AdminShell>
      </div>
    </AdminGate>
  );
}
