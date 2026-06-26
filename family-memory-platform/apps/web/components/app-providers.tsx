'use client';

import type { ReactNode } from 'react';
import { AuthProvider } from '@/components/auth-provider';
import { ThemeProvider } from '@/components/theme-provider';
import { PwaInstallPrompt } from '@/components/pwa/pwa-install-prompt';
import { OfflineProvider } from '@/components/pwa/offline-provider';

/** Survives locale navigation — must not live under `app/[locale]/layout`. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <OfflineProvider>
          {children}
          <PwaInstallPrompt />
        </OfflineProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
