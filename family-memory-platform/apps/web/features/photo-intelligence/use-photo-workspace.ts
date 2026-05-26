'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PhotoWorkspacePayload } from '@family/shared';
import { apiClient } from '@/lib/api-client';

export function usePhotoWorkspace(mediaId: string | null, token?: string | null) {
  const [workspace, setWorkspace] = useState<PhotoWorkspacePayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!mediaId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.photoIntelligence.workspace(mediaId, token);
      setWorkspace(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load photo');
    } finally {
      setLoading(false);
    }
  }, [mediaId, token]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { workspace, loading, error, reload, setWorkspace };
}
