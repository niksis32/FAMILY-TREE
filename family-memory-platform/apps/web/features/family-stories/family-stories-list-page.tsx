'use client';

import type { FamilyStorySummaryDto } from '@family/shared';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui';
import { apiClient, formatApiError } from '@/lib/api-client';

export function FamilyStoriesListPage() {
  const t = useTranslations('familyStories');
  const { session } = useAuth();
  const token = session?.accessToken;
  const [stories, setStories] = useState<FamilyStorySummaryDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      setStories(await apiClient.familyStories.list(token));
    } catch (e) {
      setError(formatApiError(e));
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-family-ink dark:text-white">{t('title')}</h1>
          <p className="mt-2 text-stone-500">{t('subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/story-drafts">
            <Button variant="secondary">Story drafts</Button>
          </Link>
          <Link href="/stories/new">
            <Button>{t('newStory')}</Button>
          </Link>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {stories.length === 0 ? (
        <p className="text-stone-500">{t('empty')}</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {stories.map((story) => (
            <li
              key={story.id}
              className="rounded-3xl border bg-white/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80"
            >
              <h2 className="text-lg font-semibold">{story.title}</h2>
              <p className="mt-1 text-sm text-stone-500">
                {story.template} · {story.visibility} · {t('views', { count: story.viewCount })}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/stories/${story.id}/edit`}>
                  <Button variant="secondary" size="sm">
                    Edit
                  </Button>
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
