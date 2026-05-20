'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Card, EmptyState } from '@/components/ui';
import { apiClient } from '@/lib/api-client';

interface MediaRecord {
  id: string;
  title?: string | null;
  mimeType: string;
  bucket: string;
  storageKey: string;
}

export function MediaGallery() {
  const { session } = useAuth();
  const [items, setItems] = useState<MediaRecord[]>([]);
  const [status, setStatus] = useState('Загружаем media metadata...');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = (await apiClient.media.list(session?.accessToken)) as MediaRecord[];
        if (cancelled) return;
        setItems(data);
        setStatus(data.length ? `Файлов в metadata: ${data.length}` : 'Media metadata пока нет');
      } catch (error) {
        if (cancelled) return;
        setStatus(error instanceof Error ? error.message : 'Не удалось загрузить media metadata');
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [session?.accessToken]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-500 dark:text-slate-400">{status}</p>
      {items.length === 0 ? <EmptyState title="Медиа нет" description="Загрузите первый файл через MinIO uploader." /> : null}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <Card key={item.id} className="p-5">
            <div className="aspect-video rounded-2xl bg-gradient-to-br from-family-primary to-slate-700" />
            <h3 className="mt-4 font-semibold">{item.title ?? item.storageKey}</h3>
            <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">{item.mimeType}</p>
            <p className="mt-2 truncate text-xs text-stone-400">
              {item.bucket}/{item.storageKey}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
