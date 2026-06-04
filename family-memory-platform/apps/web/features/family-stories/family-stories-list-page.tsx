'use client';

import type { FamilyStorySummaryDto } from '@family/shared';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { PageHero } from '@family/ui';
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
      <PageHero
        title={t('title')}
        description={t('subtitle')}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/stories/moderation">
              <Button variant="secondary">{t('moderationTitle')}</Button>
            </Link>
            <Link href="/story-drafts">
              <Button variant="secondary">Story drafts</Button>
            </Link>
            <Link href="/stories/new">
              <Button>{t('newStory')}</Button>
            </Link>
          </div>
        }
      />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {stories.length === 0 ? (
        <p className="text-stone-500">{t('empty')}</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {stories.map((story) => (
            <li
              key={story.id}
              className="rounded-[1.35rem] border bg-white/90 p-5 shadow-premium dark:border-slate-800 dark:bg-slate-900/85"
            >
              <h2 className="font-serif text-lg font-semibold text-family-ink dark:text-white">{story.title}</h2>
              <p className="mt-1 text-sm text-stone-500">
                {story.template} · {story.visibility} · {story.publishStatus} ·{' '}
                {t('views', { count: story.viewCount })}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/stories/${story.id}/edit`}>
                  <Button variant="secondary">Edit</Button>
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
