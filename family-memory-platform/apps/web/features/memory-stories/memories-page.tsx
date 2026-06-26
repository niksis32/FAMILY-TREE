'use client';

import { useEffect, useState } from 'react';
import { Button, Card, PageHeader } from '@/components/ui';
import { useAuth } from '@/components/auth-provider';
import { apiClient } from '@/lib/api-client';
import type { MemoryStoryDto } from '@family/shared';

export function MemoriesPage() {
  const { session } = useAuth();
  const token = session?.accessToken ?? null;
  const [items, setItems] = useState<MemoryStoryDto[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!token) return;
    void apiClient.memoryStories.list(token).then(setItems);
  }, [token]);

  async function openStory(id: string) {
    if (!token) return;
    setActiveId(id);
    const story = await apiClient.memoryStories.one(id, token);
    setEditText(story.transcript?.text ?? '');
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Voice & Video Memories" description="Oral histories with transcripts linked to persons." />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid gap-4">
          {items.map((m) => (
            <Card key={m.id} className={activeId === m.id ? 'ring-2 ring-primary' : 'cursor-pointer'} onClick={() => void openStory(m.id)}>
              <p className="font-semibold">{m.title}</p>
              <p className="text-sm text-stone-500">{m.subjectPersonName} · {m.status}</p>
              {m.transcript?.text ? (
                <p className="mt-2 line-clamp-3 text-sm text-stone-700">{m.transcript.text}</p>
              ) : null}
              {m.uncertaintyNote ? <p className="mt-1 text-xs text-amber-700">{m.uncertaintyNote}</p> : null}
            </Card>
          ))}
          {!items.length ? <p className="text-sm text-stone-500">No memories yet — upload audio/video and link to a person.</p> : null}
        </div>
        {activeId ? (
          <Card className="space-y-3">
            <p className="font-semibold">Transcript panel</p>
            <textarea
              className="min-h-[200px] w-full rounded-xl border p-3 text-sm"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={!token}
                onClick={async () => {
                  if (!token || !activeId) return;
                  await apiClient.memoryStories.updateTranscript(activeId, { text: editText }, token);
                  setStatus('Transcript saved and re-indexed for search.');
                }}
              >
                Save transcript
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={!token}
                onClick={async () => {
                  if (!token || !activeId) return;
                  await apiClient.memoryStories.retryTranscript(activeId, token);
                  setStatus('STT job queued (Whisper when AI profile enabled).');
                }}
              >
                Retry STT
              </Button>
            </div>
            {status ? <p className="text-xs text-stone-600">{status}</p> : null}
          </Card>
        ) : null}
      </div>
    </div>
  );
}
