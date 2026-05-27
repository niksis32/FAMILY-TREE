'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/components/auth-provider';
import { Badge, Button, Card, PageHeader } from '@/components/ui';
import { apiClient, formatApiError, type CommunityGroupRecord } from '@/lib/api-client';

type FeedAuthor = { id: string; displayName: string | null };
type FeedThread = {
  id: string;
  title: string;
  groupId: string;
  updatedAt: string;
  author: FeedAuthor | null;
};

const FEED_QUERY = `
  query CommunityFeed($take: Int, $skip: Int) {
    communityFeed(take: $take, skip: $skip) {
      total
      threads {
        id
        title
        groupId
        updatedAt
        author { id displayName }
      }
    }
  }
`;

export function CommunityHubPage() {
  const { session, isReady } = useAuth();
  const t = useTranslations('community.hub');
  const tGroups = useTranslations('community.groups');
  const [groups, setGroups] = useState<CommunityGroupRecord[]>([]);
  const [feed, setFeed] = useState<{ threads: FeedThread[]; total: number } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      const [gList, gql] = await Promise.all([
        apiClient.community.groupsList({}, session?.accessToken ?? null).catch(() => []),
        apiClient.community.graphql<{ communityFeed: { threads: FeedThread[]; total: number } }>(
          { query: FEED_QUERY, variables: { take: 8, skip: 0 } },
          session?.accessToken ?? null,
        ),
      ]);
      setGroups(Array.isArray(gList) ? gList.slice(0, 8) : []);
      if (gql.errors?.length) {
        setFeed(null);
        setError(gql.errors.map((e) => e.message).join('; '));
      } else if (gql.data?.communityFeed) {
        setFeed(gql.data.communityFeed);
      } else {
        setFeed(null);
      }
    } catch (err) {
      setError(formatApiError(err));
      setFeed(null);
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken]);

  useEffect(() => {
    if (!isReady) return;
    void load();
  }, [isReady, load]);

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('title')}
        description={t('description')}
        action={
          <Link href="/community/groups">
            <Button variant="secondary">{t('openCatalog')}</Button>
          </Link>
        }
      />

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {loading && <p className="text-sm text-stone-500">{t('loading')}</p>}

      {!loading && (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-stone-400">{t('feedEyebrow')}</p>
              <p className="mt-1 text-sm text-stone-600 dark:text-slate-400">{t('feedHint')}</p>
            </div>
            {feed && feed.total > 0 && (
              <p className="text-xs text-stone-500">{t('totalThreads', { count: feed.total })}</p>
            )}
            <ul className="space-y-3">
              {feed?.threads?.length ? (
                feed.threads.map((th) => (
                  <li
                    key={th.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-stone-200/80 bg-stone-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60"
                  >
                    <div>
                      <p className="font-medium text-family-ink dark:text-white">{th.title}</p>
                      <p className="text-xs text-stone-500">
                        {th.author?.displayName ?? th.author?.id ?? '—'} ·{' '}
                        {new Date(th.updatedAt).toLocaleString()}
                      </p>
                    </div>
                    <Link href={`/community/threads/${th.id}`}>
                      <Button variant="ghost" className="text-family-primary">
                        {t('openThread')}
                      </Button>
                    </Link>
                  </li>
                ))
              ) : (
                <li className="text-sm text-stone-500">{t('noFeed')}</li>
              )}
            </ul>
          </Card>

          <Card className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-stone-400">{t('groupsEyebrow')}</p>
              <p className="mt-1 text-sm text-stone-600 dark:text-slate-400">{t('groupsHint')}</p>
            </div>
            <ul className="space-y-3">
              {groups.length ? (
                groups.map((g) => (
                  <li
                    key={g.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-stone-200/80 px-4 py-3 dark:border-slate-800"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-family-ink dark:text-white">{g.title}</p>
                        <Badge tone="gold">{g.type}</Badge>
                      </div>
                      {g.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-stone-500">{g.description}</p>
                      )}
                    </div>
                    <Link href={`/community/groups/${g.id}`}>
                      <Button variant="secondary">{tGroups('openGroup')}</Button>
                    </Link>
                  </li>
                ))
              ) : (
                <li className="text-sm text-stone-500">{t('noGroups')}</li>
              )}
            </ul>
            <Link href="/community/groups" className="block">
              <Button variant="primary" className="w-full">
                {t('openCatalog')}
              </Button>
            </Link>
          </Card>
        </div>
      )}
    </div>
  );
}
