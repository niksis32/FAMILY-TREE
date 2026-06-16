'use client';

import { useEffect, useState } from 'react';
import { Card, PageHeader } from '@/components/ui';
import { useAuth } from '@/components/auth-provider';
import { apiClient } from '@/lib/api-client';
import type { MemoryStoryDto } from '@family/shared';

export function MemoriesPage() {
  const { session } = useAuth();
  const token = session?.accessToken ?? null;
  const [items, setItems] = useState<MemoryStoryDto[]>([]);

  useEffect(() => {
    if (!token) return;
    void apiClient.memoryStories.list(token).then(setItems);
  }, [token]);

  return (
    <div className="space-y-6">
      <PageHeader title="Voice & Video Memories" description="Oral histories with transcripts linked to persons." />
      <div className="grid gap-4">
        {items.map((m) => (
          <Card key={m.id}>
            <p className="font-semibold">{m.title}</p>
            <p className="text-sm text-stone-500">{m.subjectPersonName} · {m.status}</p>
            {m.transcript?.text ? (
              <p className="mt-2 line-clamp-3 text-sm text-stone-700">{m.transcript.text}</p>
            ) : null}
          </Card>
        ))}
        {!items.length ? <p className="text-sm text-stone-500">No memories yet — create via API or upload flow.</p> : null}
      </div>
    </div>
  );
}
