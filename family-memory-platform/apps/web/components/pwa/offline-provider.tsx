'use client';

import type { ReactNode } from 'react';
import { useAuth } from '@/components/auth-provider';
import { OfflineConflictDialog } from '@/components/pwa/offline-conflict-dialog';
import { useOfflineSync } from '@/lib/offline/sync-engine';

export function OfflineProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const { conflict, resolveConflictKeepLocal, resolveConflictKeepServer } = useOfflineSync(session?.accessToken);

  return (
    <>
      {children}
      <OfflineConflictDialog
        conflict={conflict}
        onKeepLocal={() => void resolveConflictKeepLocal()}
        onKeepServer={() => void resolveConflictKeepServer()}
      />
    </>
  );
}
