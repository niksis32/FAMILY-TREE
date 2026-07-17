'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { moduleForPathname } from '@/config/portal-modules';
import { usePortalConfig } from '@/components/portal-config-provider';

export function PortalModuleGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isModuleEnabled, loading } = usePortalConfig();

  useEffect(() => {
    if (loading) return;
    const module = moduleForPathname(pathname);
    if (module && !isModuleEnabled(module)) {
      router.replace('/dashboard');
    }
  }, [pathname, isModuleEnabled, loading, router]);

  return <>{children}</>;
}
