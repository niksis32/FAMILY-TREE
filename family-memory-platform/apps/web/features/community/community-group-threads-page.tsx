'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/components/auth-provider';
import { Badge, Button, Card, FormField, Input, PageHeader } from '@/components/ui';
import {
  apiClient,
  formatApiError,
  type CommunityForumThread,
  type CommunityGroupRecord,
} from '@/lib/api-client';

export function CommunityGroupThreadsPage({ groupId }: { groupId: string }) {
  const { session, isReady } = useAuth();
  const t = useTranslations('community.groupThreads');
  const [group, setGroup] = useState<CommunityGroupRecord | null>(null);
  const [threads, setThreads] = useState<CommunityForumThread[]>([]);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      const [g, th] = await Promise.all([
        apiClient.community.groupOne(groupId, session?.accessToken ?? null),
        apiClient.community.threadsByGroup(groupId, { take: 50 }, session?.accessToken ?? null),
      ]);
      setGroup(g);
      setThreads(Array.isArray(th) ? th : []);
    } catch (err) {
      setError(formatApiError(err));
      setGroup(null);
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }, [groupId, session?.accessToken]);

  useEffect(() => {
    if (!isReady) return;
    void load();
  }, [isReady, load]);

  const createTopic = async () => {
    if (!session?.accessToken || !title.trim()) return;
    try {
      setError('');
      await apiClient.community.createThread(groupId, { title: title.trim() }, session.accessToken);
      setTitle('');
      await load();
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={group ? t('title', { title: group.title }) : t('title', { title: '…' })}
        description={group?.description ?? ''}
        action={
          <Link href="/community/groups">
            <Button variant="secondary">{t('back')}</Button>
          </Link>
        }
      />

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {loading && <p className="text-sm text-stone-500">{t('loading')}</p>}

      {group && (
        <div className="flex flex-wrap gap-2">
          <Badge tone="gold">{group.type}</Badge>
          <Badge tone="neutral">{group.visibility}</Badge>
        </div>
      )}

      <Card className="space-y-4">
        <p className="text-xs uppercase tracking-[0.25em] text-stone-400">{t('threadsEyebrow')}</p>
        {session?.accessToken ? (
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <FormField label={t('newTopicTitle')} className="flex-1">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('newTopicTitle')} />
            </FormField>
            <Button variant="primary" onClick={() => void createTopic()} disabled={!title.trim()}>
              {t('createTopic')}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-stone-500">{t('loginHint')}</p>
        )}
        <ul className="space-y-3">
          {threads.length === 0 && !loading ? (
            <li className="text-sm text-stone-500">{t('empty')}</li>
          ) : (
            threads.map((th) => (
              <li
                key={th.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-stone-200/80 px-4 py-3 dark:border-slate-800"
              >
                <div>
                  <p className="font-medium text-family-ink dark:text-white">{th.title}</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <Badge
                      tone={
                        th.contentStatus === 'PUBLISHED'
                          ? 'green'
                          : th.contentStatus === 'PENDING_REVIEW'
                            ? 'gold'
                            : 'muted'
                      }
                    >
                      {th.contentStatus}
                    </Badge>
                    <span className="text-xs text-stone-500">
                      {t('replies', { count: th._count?.posts ?? 0 })}
                    </span>
                  </div>
                </div>
                <Link href={`/community/threads/${th.id}`}>
                  <Button variant="secondary">{t('openThread')}</Button>
                </Link>
              </li>
            ))
          )}
        </ul>
      </Card>
    </div>
  );
}
