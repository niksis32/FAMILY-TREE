'use client';

import { useEffect, useState } from 'react';
import { Button, Card, PageHeader } from '@/components/ui';
import { useAuth } from '@/components/auth-provider';
import { apiClient } from '@/lib/api-client';
import type { FaceClusterSummaryDto, PeopleSummaryDto } from '@family/shared';

export function PeopleInPhotosPage() {
  const { session } = useAuth();
  const token = session?.accessToken ?? null;
  const [summary, setSummary] = useState<PeopleSummaryDto | null>(null);
  const [clusters, setClusters] = useState<FaceClusterSummaryDto[]>([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!token) return;
    void (async () => {
      const [s, c] = await Promise.all([
        apiClient.faceClustering.peopleSummary(token),
        apiClient.faceClustering.listClusters(token),
      ]);
      setSummary(s);
      setClusters(c);
    })();
  }, [token]);

  return (
    <div className="space-y-6">
      <PageHeader title="People in Photos" description="Face clusters and bulk assign across the archive." />
      {summary ? (
        <div className="grid gap-4 sm:grid-cols-4">
          <Card><p className="text-xs text-stone-500">Total faces</p><p className="text-2xl font-semibold">{summary.totalFaces}</p></Card>
          <Card><p className="text-xs text-stone-500">Unassigned</p><p className="text-2xl font-semibold">{summary.unassignedFaces}</p></Card>
          <Card><p className="text-xs text-stone-500">Pending clusters</p><p className="text-2xl font-semibold">{summary.pendingClusters}</p></Card>
          <Card><p className="text-xs text-stone-500">Assigned clusters</p><p className="text-2xl font-semibold">{summary.assignedClusters}</p></Card>
        </div>
      ) : null}
      <Button
        type="button"
        disabled={!token}
        onClick={async () => {
          if (!token) return;
          setStatus('Rebuilding clusters…');
          await apiClient.faceClustering.rebuild(token);
          const c = await apiClient.faceClustering.listClusters(token);
          setClusters(c);
          setStatus('Rebuild queued or completed inline.');
        }}
      >
        Recompute clusters
      </Button>
      {status ? <p className="text-sm text-stone-600">{status}</p> : null}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {clusters.map((c) => (
          <Card key={c.id}>
            <p className="font-semibold">{c.label ?? `Cluster ${c.id.slice(0, 8)}`}</p>
            <p className="text-sm text-stone-500">{c.memberCount} faces · {c.status}</p>
            {c.personName ? <p className="text-sm">→ {c.personName}</p> : null}
          </Card>
        ))}
      </div>
    </div>
  );
}
