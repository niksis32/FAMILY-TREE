'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AdminModerationQueueStats } from '@family/shared';
import { useAuth } from '@/components/auth-provider';
import { apiClient } from '@/lib/api-client';

export const ADMIN_MODERATION_CHANGED_EVENT = 'admin-moderation-changed';

interface AdminModerationQueuesState {
  stats: AdminModerationQueueStats | null;
  loading: boolean;
  refresh: () => Promise<void>;
  hasPending: boolean;
  militaryPending: number;
}

const AdminModerationQueuesContext = createContext<AdminModerationQueuesState | null>(null);

export function AdminModerationQueuesProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [stats, setStats] = useState<AdminModerationQueueStats | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!session?.accessToken || session.user.role !== 'ADMIN') {
      setStats(null);
      return;
    }
    setLoading(true);
    try {
      const result = await apiClient.admin.moderationQueueStats(session.accessToken);
      setStats(result);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken, session?.user.role]);

  useEffect(() => {
    void refresh();
    const onChange = () => void refresh();
    window.addEventListener(ADMIN_MODERATION_CHANGED_EVENT, onChange);
    window.addEventListener('focus', onChange);
    return () => {
      window.removeEventListener(ADMIN_MODERATION_CHANGED_EVENT, onChange);
      window.removeEventListener('focus', onChange);
    };
  }, [refresh]);

  const value = useMemo(
    () => ({
      stats,
      loading,
      refresh,
      hasPending: (stats?.total ?? 0) > 0,
      militaryPending: stats?.militaryConflicts ?? 0,
    }),
    [stats, loading, refresh],
  );

  return <AdminModerationQueuesContext.Provider value={value}>{children}</AdminModerationQueuesContext.Provider>;
}

export function useAdminModerationQueues() {
  const ctx = useContext(AdminModerationQueuesContext);
  if (!ctx) {
    return {
      stats: null,
      loading: false,
      refresh: async () => {},
      hasPending: false,
      militaryPending: 0,
    };
  }
  return ctx;
}

export function notifyAdminModerationChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ADMIN_MODERATION_CHANGED_EVENT));
  }
}
