'use client';

import { useCallback, useEffect, useState } from 'react';
import type { WorkspaceCommercialOverview } from '@family/shared';
import { useAuth } from '@/components/auth-provider';
import { api, formatApiError } from '@/lib/api-client';

export function useWorkspaceCommercial() {
  const { session } = useAuth();
  const token = session?.accessToken ?? null;
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [overview, setOverview] = useState<WorkspaceCommercialOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const workspaces = await api.commercial.myWorkspaces(token);
      const primary = workspaces.find((w: { isDefault: boolean }) => w.isDefault) ?? workspaces[0];
      if (!primary) {
        setError('Workspace не найден');
        setLoading(false);
        return;
      }
      setWorkspaceId(primary.id);
      const data = await api.commercial.overview(primary.id, token);
      setOverview(data);
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { token, workspaceId, overview, error, loading, reload };
}
