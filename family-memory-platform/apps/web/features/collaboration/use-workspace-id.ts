'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { apiClient } from '@/lib/api-client';

export function useWorkspaceId() {
  const { session } = useAuth();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!session?.accessToken) {
      setWorkspaceId(null);
      return;
    }
    const workspaces = await apiClient.commercial.myWorkspaces(session.accessToken);
    const primary = workspaces.find((w) => w.isDefault) ?? workspaces[0];
    setWorkspaceId(primary?.id ?? null);
  }, [session?.accessToken]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return workspaceId;
}
