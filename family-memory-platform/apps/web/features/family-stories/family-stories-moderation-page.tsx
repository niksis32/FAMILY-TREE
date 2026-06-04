'use client';

import type { FamilyStoryModerationQueueItemDto } from '@family/shared';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { CoverImage, PageHero } from '@family/ui';
import { useAuth } from '@/components/auth-provider';
import { Button, Input } from '@/components/ui';
import { apiClient, formatApiError } from '@/lib/api-client';

export function FamilyStoriesModerationPage() {
  const t = useTranslations('familyStories');
  const { session } = useAuth();
  const token = session?.accessToken;
  const [queue, setQueue] = useState<FamilyStoryModerationQueueItemDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      setQueue(await apiClient.familyStories.moderationQueue(token));
      setError(null);
    } catch (e) {
      setError(formatApiError(e));
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const approve = async (id: string) => {
    if (!token) return;
    setBusyId(id);
    try {
      await apiClient.familyStories.moderationApprove(id, {}, token);
      await refresh();
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id: string) => {
    if (!token) return;
    const note = rejectNotes[id]?.trim();
    if (!note) {
      setError(t('moderationRejectNoteRequired'));
      return;
    }
    setBusyId(id);
    try {
      await apiClient.familyStories.moderationReject(id, { moderationNote: note }, token);
      await refresh();
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-8">
      <PageHero title={t('moderationTitle')} description={t('moderationSubtitle')} />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {queue.length === 0 ? (
        <p className="text-stone-500">{t('moderationEmpty')}</p>
      ) : (
        <ul className="space-y-4">
          {queue.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-4 rounded-[1.35rem] border bg-white/90 p-5 shadow-premium dark:border-slate-800 dark:bg-slate-900/85 md:flex-row"
            >
                {item.coverUrl ? (
                  <CoverImage
                    src={item.coverUrl}
                    alt={item.title}
                    className="h-28 w-full shrink-0 rounded-xl md:w-40"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <h2 className="font-serif text-lg font-semibold text-family-ink dark:text-white">{item.title}</h2>
                  <p className="mt-1 text-sm text-stone-500">
                    {item.visibility} · {item.publishStatus}
                    {item.slug ? ` · /p/${item.slug}` : ''}
                  </p>
                  <p className="mt-1 text-sm text-stone-500">
                    {item.createdBy.displayName ?? item.createdBy.email}
                  </p>
                  <Link href={`/stories/${item.id}/edit`} className="mt-2 inline-block text-sm text-family-primary">
                    {t('moderationPreview')}
                  </Link>
                  <label className="mt-4 block space-y-1">
                    <span className="text-xs font-medium text-stone-500">{t('moderationRejectNote')}</span>
                    <Input
                      value={rejectNotes[item.id] ?? ''}
                      onChange={(e) =>
                        setRejectNotes((prev) => ({ ...prev, [item.id]: e.target.value }))
                      }
                      placeholder={t('moderationRejectNotePlaceholder')}
                    />
                  </label>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button onClick={() => void approve(item.id)} disabled={busyId === item.id}>
                      {t('moderationApprove')}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => void reject(item.id)}
                      disabled={busyId === item.id}
                    >
                      {t('moderationReject')}
                    </Button>
                  </div>
                </div>
              </li>
          ))}
        </ul>
      )}
    </div>
  );
}
