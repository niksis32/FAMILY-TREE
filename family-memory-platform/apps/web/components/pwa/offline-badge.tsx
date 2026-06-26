'use client';

import { WifiOff } from 'lucide-react';
import { useOfflineSync } from '@/lib/offline/sync-engine';
import { useAuth } from '@/components/auth-provider';

export function OfflineBadge() {
  const { session } = useAuth();
  const { online, pendingCount } = useOfflineSync(session?.accessToken);

  if (online && pendingCount === 0) return null;

  return (
    <div
      className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200"
      title={online ? `Синхронизация: ${pendingCount} в очереди` : 'Офлайн — изменения сохранятся локально'}
    >
      <WifiOff className="h-3.5 w-3.5" />
      {online ? `Sync ${pendingCount}` : 'Offline'}
    </div>
  );
}
