'use client';

import { Button } from '@/components/ui';
import type { SyncConflict } from '@/lib/offline/sync-engine';

export function OfflineConflictDialog({
  conflict,
  onKeepLocal,
  onKeepServer,
}: {
  conflict: SyncConflict | null;
  onKeepLocal: () => void;
  onKeepServer: () => void;
}) {
  if (!conflict) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="max-w-md rounded-2xl border bg-white p-6 shadow-xl dark:bg-slate-900">
        <h3 className="text-lg font-semibold">Конфликт синхронизации</h3>
        <p className="mt-2 text-sm text-stone-600 dark:text-slate-300">{conflict.message}</p>
        <p className="mt-2 text-xs text-stone-500">Person ID: {conflict.entry.entityId}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button type="button" onClick={onKeepLocal}>
            Оставить мои изменения
          </Button>
          <Button type="button" variant="secondary" onClick={onKeepServer}>
            Взять версию сервера
          </Button>
        </div>
      </div>
    </div>
  );
}
