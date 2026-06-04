'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/components/auth-provider';
import { Badge, Button, Card, FormField, PageHeader, Textarea } from '@/components/ui';
import {
  apiClient,
  formatApiError,
  type CommunityForumPost,
  type CommunityForumThread,
} from '@/lib/api-client';
import { CommunityReportModal } from '@/features/community/community-report-modal';

const PAGE = 15;

function statusTone(s: string): 'green' | 'gold' | 'red' | 'muted' {
  if (s === 'PUBLISHED') return 'green';
  if (s === 'PENDING_REVIEW') return 'gold';
  if (s === 'HIDDEN' || s === 'DELETED') return 'red';
  return 'muted';
}

function statusLabel(t: (key: string) => string, s: string) {
  if (s === 'PUBLISHED') return t('statusPublished');
  if (s === 'PENDING_REVIEW') return t('statusPending');
  if (s === 'HIDDEN') return t('statusHidden');
  return s;
}

export function CommunityThreadPage({ threadId }: { threadId: string }) {
  const { session, isReady } = useAuth();
  const t = useTranslations('community.thread');
  const [thread, setThread] = useState<CommunityForumThread | null>(null);
  const [posts, setPosts] = useState<CommunityForumPost[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [content, setContent] = useState('');
  const [living, setLiving] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reportPostId, setReportPostId] = useState<string | null>(null);

  const token = session?.accessToken ?? null;

  const reloadAll = useCallback(async () => {
    setError('');
    const th = await apiClient.community.threadOne(threadId, token);
    setThread(th);
    const list = await apiClient.community.postsByThread(threadId, { take: PAGE, skip: 0 }, token);
    const arr = Array.isArray(list) ? list : [];
    setPosts(arr);
    setHasMore(arr.length === PAGE);
  }, [threadId, token]);

  useEffect(() => {
    if (!isReady) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await reloadAll();
      } catch (err) {
        if (!cancelled) setError(formatApiError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isReady, reloadAll]);

  const loadMore = async () => {
    try {
      const list = await apiClient.community.postsByThread(
        threadId,
        { take: PAGE, skip: posts.length },
        token,
      );
      const arr = Array.isArray(list) ? list : [];
      setPosts((prev) => [...prev, ...arr]);
      setHasMore(arr.length === PAGE);
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  const submitPost = async () => {
    if (!session?.accessToken || !content.trim()) return;
    try {
      setError('');
      await apiClient.community.createPost(
        threadId,
        {
          content: content.trim(),
          referencesLivingPersonData: living,
          hasConsentForPublicLivingData: consent,
        },
        session.accessToken,
      );
      setContent('');
      setLiving(false);
      setConsent(false);
      await reloadAll();
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  const onHelpful = async (postId: string) => {
    if (!session?.accessToken) return;
    try {
      await apiClient.community.markHelpful(postId, session.accessToken);
      await reloadAll();
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  const backHref = thread?.groupId ? `/community/groups/${thread.groupId}` : '/community/groups';

  return (
    <div className="space-y-8">
      <PageHeader
        title={thread?.title ?? t('title')}
        description={thread?.document ? `${thread.document.documentType}: ${thread.document.title}` : ''}
        action={
          <Link href={backHref}>
            <Button variant="secondary">{t('back')}</Button>
          </Link>
        }
      />

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {loading && <p className="text-sm text-stone-500">{t('loading')}</p>}

      <Card className="space-y-4">
        <p className="text-xs uppercase tracking-[0.25em] text-stone-400">{t('postsEyebrow')}</p>
        {posts.length === 0 && !loading ? (
          <p className="text-sm text-stone-500">{t('emptyPosts')}</p>
        ) : (
          <ul className="space-y-4">
            {posts.map((p) => (
              <li
                key={p.id}
                className="rounded-2xl border border-stone-200/80 bg-stone-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-family-ink dark:text-white">
                      {p.author?.displayName ?? p.authorId}
                    </p>
                    <p className="text-xs text-stone-500">{new Date(p.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {typeof p.authorReputationInGroup === 'number' && (
                      <Badge tone="gold">{t('repBadge', { score: p.authorReputationInGroup })}</Badge>
                    )}
                    {p.isExpertAnswer && <Badge tone="blue">{t('expert')}</Badge>}
                    <Badge tone={statusTone(p.contentStatus)}>{statusLabel(t, p.contentStatus)}</Badge>
                  </div>
                </div>
                {p.referencesLivingPersonData && (
                  <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">{t('livingFlag')}</p>
                )}
                {p.hasConsentForPublicLivingData && (
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">{t('consentFlag')}</p>
                )}
                <p className="mt-3 whitespace-pre-wrap text-sm text-stone-800 dark:text-slate-200">{p.content}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-stone-500">
                    {t('helpful')}: {p.helpfulCount}
                  </span>
                  {session?.accessToken && p.authorId !== session.user.id && !p.viewerMarkedHelpful && (
                    <Button variant="ghost" type="button" onClick={() => void onHelpful(p.id)}>
                      {t('helpful')}
                    </Button>
                  )}
                  {p.viewerMarkedHelpful && <Badge tone="green">{t('helpful')} ✓</Badge>}
                  {session?.accessToken && p.authorId !== session.user.id && (
                    <Button variant="ghost" type="button" onClick={() => setReportPostId(p.id)}>
                      {t('report')}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {hasMore && posts.length > 0 && (
          <Button variant="secondary" type="button" onClick={() => void loadMore()}>
            {t('loadMore')}
          </Button>
        )}
      </Card>

      <Card className="space-y-4">
        <p className="text-sm font-semibold text-family-ink dark:text-white">{t('yourReply')}</p>
        <p className="text-xs text-stone-500">{t('rateLimitHint')}</p>
        {session?.accessToken ? (
          <>
            <FormField label={t('placeholder')}>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} />
            </FormField>
            <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-slate-300">
              <input type="checkbox" checked={living} onChange={(e) => setLiving(e.target.checked)} />
              {t('livingFlag')}
            </label>
            <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-slate-300">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              {t('consentFlag')}
            </label>
            <Button variant="primary" type="button" onClick={() => void submitPost()} disabled={!content.trim()}>
              {t('submit')}
            </Button>
          </>
        ) : (
          <p className="text-sm text-stone-500">{t('loginHint')}</p>
        )}
      </Card>

      {reportPostId && session?.accessToken && (
        <CommunityReportModal
          targetType="FORUM_POST"
          targetId={reportPostId}
          token={session.accessToken}
          onClose={() => setReportPostId(null)}
        />
      )}
    </div>
  );
}
