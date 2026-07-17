'use client';

import { usePathname } from '@/i18n/navigation';
import { AdminAppShell } from '@/components/admin-app-shell';
import { AppShell } from '@/components/app-shell';
import { PortalConfigProvider } from '@/components/portal-config-provider';
import { PortalModuleGuard } from '@/components/portal-module-guard';

function isAdminPath(pathname: string) {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

export function PlatformLayoutSwitch({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (isAdminPath(pathname)) {
    return <AdminAppShell>{children}</AdminAppShell>;
  }

  return (
    <PortalConfigProvider>
      <PortalModuleGuard>
        <AppShell>{children}</AppShell>
      </PortalModuleGuard>
    </PortalConfigProvider>
  );
}
