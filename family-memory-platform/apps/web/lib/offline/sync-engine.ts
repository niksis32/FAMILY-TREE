'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  enqueueOutbox,
  getCachedPerson,
  listOutbox,
  removeOutbox,
  updateOutbox,
  type OutboxEntry,
} from '@/lib/offline/idb';

export type SyncConflict = {
  entry: OutboxEntry;
  serverVersion?: number;
  message: string;
};

export async function queuePersonUpdate(
  personId: string,
  payload: Record<string, unknown>,
  expectedVersion?: number,
) {
  return enqueueOutbox({ type: 'person.update', entityId: personId, payload, expectedVersion });
}

export function useOfflineSync(token?: string | null) {
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [conflict, setConflict] = useState<SyncConflict | null>(null);
  const [syncing, setSyncing] = useState(false);

  const refreshPending = useCallback(async () => {
    const rows = await listOutbox();
    setPendingCount(rows.length);
  }, []);

  const syncOutbox = useCallback(async () => {
    if (!token || !navigator.onLine) return;
    setSyncing(true);
    try {
      const rows = await listOutbox();
      for (const entry of rows) {
        if (entry.type !== 'person.update') continue;
        try {
          await apiClient.persons.update(entry.entityId, entry.payload, token, entry.expectedVersion);
          await removeOutbox(entry.id);
        } catch (error) {
          const status = error instanceof Error && 'status' in error ? (error as { status: number }).status : 0;
          if (status === 409) {
            setConflict({
              entry,
              message: 'Конфликт версии — профиль изменён на сервере',
            });
            break;
          }
          await updateOutbox({ ...entry, retries: entry.retries + 1, lastError: String(error) });
        }
      }
      await refreshPending();
    } finally {
      setSyncing(false);
    }
  }, [token, refreshPending]);

  useEffect(() => {
    setOnline(navigator.onLine);
    const onOnline = () => {
      setOnline(true);
      void syncOutbox();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    void refreshPending();
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [refreshPending, syncOutbox]);

  const resolveConflictKeepLocal = async () => {
    if (!conflict || !token) return;
    await apiClient.persons.update(conflict.entry.entityId, conflict.entry.payload, token);
    await removeOutbox(conflict.entry.id);
    setConflict(null);
    await refreshPending();
  };

  const resolveConflictKeepServer = async () => {
    if (!conflict) return;
    await removeOutbox(conflict.entry.id);
    setConflict(null);
    await refreshPending();
  };

  return {
    online,
    pendingCount,
    syncing,
    conflict,
    syncOutbox,
    refreshPending,
    resolveConflictKeepLocal,
    resolveConflictKeepServer,
    getCachedPerson,
  };
}
