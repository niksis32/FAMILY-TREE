'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/components/auth-provider';
import { Card, EmptyState } from '@/components/ui';
import { PhotoViewerModal } from '@/features/photo-intelligence/photo-viewer-modal';
import { apiClient } from '@/lib/api-client';
import { useFormatApiError } from '@/lib/use-format-api-error';

interface MediaRecord {
  id: string;
  title?: string | null;
  mimeType: string;
  bucket: string;
  storageKey: string;
}

export function MediaGallery() {
  const { session } = useAuth();
  const t = useTranslations('mediaGallery');
  const tPhoto = useTranslations('photoIntelligence');
  const formatApiError = useFormatApiError();
  const [items, setItems] = useState<MediaRecord[]>([]);
  const [status, setStatus] = useState('');
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [modalMediaId, setModalMediaId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus(t('loading'));
      try {
        const data = (await apiClient.media.list(session?.accessToken)) as MediaRecord[];
        if (cancelled) return;
        setItems(data);
        setStatus(data.length ? t('filesCount', { count: data.length }) : t('noMetadata'));

        const imageItems = data.filter((item) => item.mimeType.startsWith('image/'));
        const entries = await Promise.all(
          imageItems.map(async (item) => {
            try {
              const dl = await apiClient.media.downloadUrl(item.id, session?.accessToken);
              return [item.id, dl.downloadUrl] as const;
            } catch {
              return [item.id, ''] as const;
            }
          }),
        );
        if (!cancelled) {
          setPreviewUrls(Object.fromEntries(entries.filter(([, url]) => url)));
        }
      } catch (error) {
        if (cancelled) return;
        setStatus(formatApiError(error));
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accessToken]);

  const modalItem = items.find((item) => item.id === modalMediaId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone-500 dark:text-slate-400">{status}</p>
        <Link href="/media/tagging" className="text-sm font-medium text-family-primary hover:underline">
          {tPhoto('bulkTaggingLink')}
        </Link>
      </div>
      {items.length === 0 ? <EmptyState title={t('emptyTitle')} description={t('emptyDesc')} /> : null}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const isImage = item.mimeType.startsWith('image/');
          const preview = previewUrls[item.id];
          return (
            <Card key={item.id} className="overflow-hidden p-0">
              <button
                type="button"
                className="block w-full text-left"
                onClick={() => {
                  if (isImage) setModalMediaId(item.id);
                }}
              >
                <div className="aspect-video bg-gradient-to-br from-family-primary to-slate-700">
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt={item.title ?? item.storageKey} className="h-full w-full object-cover" />
                  ) : null}
                </div>
              </button>
              <div className="p-5">
                <h3 className="font-semibold">{item.title ?? item.storageKey}</h3>
                <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">{item.mimeType}</p>
                {isImage ? (
                  <div className="mt-3 flex gap-3 text-sm">
                    <button
                      type="button"
                      className="text-family-primary hover:underline"
                      onClick={() => setModalMediaId(item.id)}
                    >
                      {tPhoto('quickView')}
                    </button>
                    <Link href={`/media/${item.id}`} className="text-family-primary hover:underline">
                      {tPhoto('openFullPage')}
                    </Link>
                  </div>
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>
      {modalMediaId && modalItem ? (
        <PhotoViewerModal
          mediaId={modalMediaId}
          title={modalItem.title}
          onClose={() => setModalMediaId(null)}
        />
      ) : null}
    </div>
  );
}
