'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ImageIcon, Sparkles, Tag, Trash2 } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/components/auth-provider';
import { MediaPreview } from '@/components/media-preview';
import { Button } from '@/components/ui';
import { PhotoViewerModal } from '@/features/photo-intelligence/photo-viewer-modal';
import { apiClient } from '@/lib/api-client';
import { useFormatApiError } from '@/lib/use-format-api-error';
import { cn } from '@/lib/utils';

interface MediaRecord {
  id: string;
  title?: string | null;
  mimeType: string;
  bucket: string;
  storageKey: string;
}

export function MediaGallery({ refreshKey = 0 }: { refreshKey?: number }) {
  const { session } = useAuth();
  const t = useTranslations('mediaGallery');
  const tPhoto = useTranslations('photoIntelligence');
  const formatApiError = useFormatApiError();
  const [items, setItems] = useState<MediaRecord[]>([]);
  const [status, setStatus] = useState('');
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [modalMediaId, setModalMediaId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus(t('loading'));
    try {
      const data = (await apiClient.media.list(session?.accessToken)) as MediaRecord[];
      setItems(data);
      setStatus(data.length ? t('filesCount', { count: data.length }) : t('noMetadata'));

      const entries = await Promise.all(
        data.map(async (item) => {
          try {
            const dl = await apiClient.media.downloadUrl(item.id, session?.accessToken);
            return [item.id, dl.downloadUrl] as const;
          } catch {
            return [item.id, ''] as const;
          }
        }),
      );
      setPreviewUrls(Object.fromEntries(entries.filter(([, url]) => url)));
    } catch (error) {
      setStatus(formatApiError(error));
    }
  }, [session?.accessToken, t, formatApiError]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  async function removeMedia(id: string) {
    if (!session?.accessToken || !window.confirm(t('deleteConfirm'))) return;
    setDeletingId(id);
    try {
      await apiClient.media.remove(id, session.accessToken);
      await load();
    } catch (error) {
      setStatus(formatApiError(error));
    } finally {
      setDeletingId(null);
    }
  }

  const modalItem = items.find((item) => item.id === modalMediaId);
  const imageCount = items.filter((i) => i.mimeType.startsWith('image/')).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-family-accent/15 bg-gradient-to-r from-family-surface to-white px-5 py-4 dark:from-slate-900 dark:to-slate-950">
        <div>
          <p className="text-sm text-stone-500 dark:text-slate-400">{status}</p>
          <p className="mt-1 text-xs text-stone-400">{t('imageCount', { count: imageCount })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/media/tagging">
            <Button variant="secondary" type="button">
              <Tag className="mr-2 h-4 w-4" />
              {tPhoto('bulkTaggingLink')}
            </Button>
          </Link>
          <Link href="/ai-lab">
            <Button variant="ghost" type="button">
              <Sparkles className="mr-2 h-4 w-4" />
              AI Lab
            </Button>
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-[1.35rem] border border-dashed px-8 py-16 text-center">
          <ImageIcon className="mx-auto h-12 w-12 text-family-accent/50" />
          <p className="font-serif mt-4 text-lg font-semibold">{t('emptyTitle')}</p>
          <p className="mt-2 text-sm text-stone-500">{t('emptyDesc')}</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const isImage = item.mimeType.startsWith('image/');
            const preview = previewUrls[item.id];
            return (
              <article
                key={item.id}
                className="group overflow-hidden rounded-[1.35rem] border bg-white/90 shadow-premium transition hover:-translate-y-0.5 dark:bg-slate-900/85"
              >
                <button
                  type="button"
                  className="block w-full text-left"
                  onClick={() => {
                    if (isImage) setModalMediaId(item.id);
                  }}
                >
                  <div className="relative aspect-[4/3] bg-gradient-to-br from-family-primary/80 to-slate-800">
                    <MediaPreview mimeType={item.mimeType} downloadUrl={preview} title={item.title} />
                    {isImage ? (
                      <span className="absolute bottom-3 left-3 rounded-full bg-black/50 px-2 py-1 text-xs text-white backdrop-blur">
                        {tPhoto('quickView')}
                      </span>
                    ) : null}
                  </div>
                </button>
                <div className="p-4">
                  <h3 className="truncate font-semibold text-family-ink dark:text-white">
                    {item.title ?? item.storageKey}
                  </h3>
                  <p className="mt-1 truncate text-xs text-stone-500">{item.mimeType}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {isImage ? (
                      <button
                        type="button"
                        className={cn(
                          'rounded-xl bg-family-primary/10 px-3 py-1.5 text-xs font-semibold text-family-primary dark:bg-family-accent/15 dark:text-family-accent',
                        )}
                        onClick={() => setModalMediaId(item.id)}
                      >
                        {tPhoto('quickView')}
                      </button>
                    ) : preview ? (
                      <a
                        href={preview}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border px-3 py-1.5 text-xs font-semibold text-stone-600 dark:text-slate-300"
                      >
                        {t('openFile')}
                      </a>
                    ) : null}
                    <Link
                      href={`/media/${item.id}`}
                      className="rounded-xl border px-3 py-1.5 text-xs font-semibold text-stone-600 dark:text-slate-300"
                    >
                      {tPhoto('openFullPage')}
                    </Link>
                    <button
                      type="button"
                      disabled={deletingId === item.id}
                      className="inline-flex items-center gap-1 rounded-xl border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 dark:border-red-900 dark:text-red-400"
                      onClick={() => void removeMedia(item.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t('delete')}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {modalMediaId && modalItem ? (
        <PhotoViewerModal mediaId={modalMediaId} title={modalItem.title} onClose={() => setModalMediaId(null)} />
      ) : null}
    </div>
  );
}
