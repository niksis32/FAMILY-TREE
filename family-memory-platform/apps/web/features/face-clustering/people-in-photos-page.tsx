'use client';

import { useEffect, useState } from 'react';
import { Button, Card, PageHeader } from '@/components/ui';
import { useAuth } from '@/components/auth-provider';
import { apiClient } from '@/lib/api-client';
import type { FaceClusterMemberDto, FaceClusterSummaryDto, PeopleSummaryDto } from '@family/shared';

export function PeopleInPhotosPage() {
  const { session } = useAuth();
  const token = session?.accessToken ?? null;
  const [summary, setSummary] = useState<PeopleSummaryDto | null>(null);
  const [clusters, setClusters] = useState<FaceClusterSummaryDto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [members, setMembers] = useState<FaceClusterMemberDto[]>([]);
  const [mergeTargetId, setMergeTargetId] = useState('');
  const [assignPersonId, setAssignPersonId] = useState('');
  const [selectedEmbeddings, setSelectedEmbeddings] = useState<string[]>([]);
  const [status, setStatus] = useState('');

  async function reloadClusters() {
    if (!token) return;
    const [s, c] = await Promise.all([
      apiClient.faceClustering.peopleSummary(token),
      apiClient.faceClustering.listClusters(token),
    ]);
    setSummary(s);
    setClusters(c);
  }

  useEffect(() => {
    void reloadClusters();
  }, [token]);

  async function openCluster(id: string) {
    if (!token) return;
    setSelectedId(id);
    const detail = await apiClient.faceClustering.cluster(id, token);
    setMembers(detail.members ?? []);
    setSelectedEmbeddings([]);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="People in Photos" description="Face clusters — review, merge, split, assign person." />
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
          await reloadClusters();
          setStatus('Rebuild queued or completed inline.');
        }}
      >
        Recompute clusters
      </Button>
      {status ? <p className="text-sm text-stone-600">{status}</p> : null}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="grid gap-3 md:grid-cols-2">
          {clusters.map((c) => (
            <Card
              key={c.id}
              className={selectedId === c.id ? 'ring-2 ring-primary' : 'cursor-pointer'}
              onClick={() => void openCluster(c.id)}
            >
              <p className="font-semibold">{c.label ?? `Cluster ${c.id.slice(0, 8)}`}</p>
              <p className="text-sm text-stone-500">{c.memberCount} faces · {c.status}</p>
              {c.personName ? <p className="text-sm">→ {c.personName}</p> : null}
            </Card>
          ))}
        </div>
        {selectedId ? (
          <Card className="space-y-3">
            <p className="font-semibold">Cluster review</p>
            <p className="text-xs text-stone-500">{members.length} member(s) — select faces to split</p>
            <div className="max-h-48 space-y-1 overflow-y-auto text-xs">
              {members.map((m) => (
                <label key={m.embeddingId} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedEmbeddings.includes(m.embeddingId)}
                    onChange={(e) => {
                      setSelectedEmbeddings((prev) =>
                        e.target.checked ? [...prev, m.embeddingId] : prev.filter((id) => id !== m.embeddingId),
                      );
                    }}
                  />
                  face {m.faceTagId.slice(0, 8)} · media {m.mediaId.slice(0, 8)}
                </label>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                className="rounded border px-2 py-1 text-sm"
                placeholder="Person ID to assign"
                value={assignPersonId}
                onChange={(e) => setAssignPersonId(e.target.value)}
              />
              <Button
                type="button"
                disabled={!token || !assignPersonId.trim()}
                onClick={async () => {
                  if (!token || !selectedId) return;
                  await apiClient.faceClustering.assignPerson(selectedId, assignPersonId.trim(), token);
                  await reloadClusters();
                  await openCluster(selectedId);
                  setStatus('Person assigned to cluster.');
                }}
              >
                Assign person
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                className="rounded border px-2 py-1 text-sm"
                placeholder="Merge into cluster ID"
                value={mergeTargetId}
                onChange={(e) => setMergeTargetId(e.target.value)}
              />
              <Button
                type="button"
                disabled={!token || !mergeTargetId.trim()}
                onClick={async () => {
                  if (!token || !selectedId) return;
                  await apiClient.faceClustering.merge(selectedId, mergeTargetId.trim(), token);
                  setSelectedId(null);
                  await reloadClusters();
                  setStatus('Clusters merged.');
                }}
              >
                Merge into…
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={!token || selectedEmbeddings.length === 0}
                onClick={async () => {
                  if (!token || !selectedId) return;
                  await apiClient.faceClustering.split(selectedId, selectedEmbeddings, token);
                  await reloadClusters();
                  setStatus('Cluster split — new UNREVIEWED cluster created.');
                }}
              >
                Split selected
              </Button>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
