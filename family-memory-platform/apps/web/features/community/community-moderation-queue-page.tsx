'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/components/auth-provider';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  FormField,
  PageHeader,
  Select,
  StatCard,
  Textarea,
} from '@/components/ui';
import {
  apiClient,
  formatApiError,
  type ModerationPendingPostRecord,
  type ModerationQueueResponse,
  type ModerationReportCategory,
  type ModerationReportRecord,
} from '@/lib/api-client';

type QueueTab = 'pending' | 'reports';

function categoryTone(c: ModerationReportCategory): 'red' | 'gold' | 'blue' | 'muted' {
  if (c === 'HARASSMENT' || c === 'SPAM') return 'red';
  if (c === 'PERSONAL_DATA_LIVING') return 'gold';
  if (c === 'MISINFORMATION') return 'blue';
  return 'muted';
}

function reportStatusTone(s: string): 'gold' | 'green' | 'muted' {
  if (s === 'OPEN') return 'gold';
  if (s === 'UNDER_REVIEW') return 'green';
  return 'muted';
}

function PendingPostCard({
  post,
  token,
  onDone,
}: {
  post: ModerationPendingPostRecord;
  token: string;
  onDone: () => void;
}) {
  const t = useTranslations('community.moderation');
  const [note, setNote] = useState('');
  const [strike, setStrike] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const act = async (action: 'approve' | 'hide') => {
    setBusy(true);
    setError('');
    try {
      if (action === 'approve') {
        await apiClient.community.approvePost(post.id, token);
      } else {
        await apiClient.community.hidePost(
          post.id,
          { moderatorNote: note.trim() || undefined, applyStrikeToAuthor: strike },
          token,
        );
      }
      onDone();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-family-ink dark:text-white">
            {post.author.displayName ?? post.authorId}
          </p>
          <p className="text-xs text-stone-500">{new Date(post.createdAt).toLocaleString()}</p>
        </div>
        <Badge tone="gold">{t('autoReview')}</Badge>
      </div>
      <p className="mt-2 text-xs text-stone-600 dark:text-slate-400">
        {t('inThread', { title: post.thread.title, group: post.thread.group.title })}
      </p>
      {post.referencesLivingPersonData && (
        <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">{t('livingFlag')}</p>
      )}
      <p className="mt-3 whitespace-pre-wrap text-sm text-stone-800 dark:text-slate-200">{post.content}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={`/community/threads/${post.threadId}`}>
          <Button variant="ghost" type="button">
            {t('openThread')}
          </Button>
        </Link>
        <Button variant="primary" type="button" disabled={busy} onClick={() => void act('approve')}>
          {t('approve')}
        </Button>
        <Button variant="secondary" type="button" disabled={busy} onClick={() => void act('hide')}>
          {t('hide')}
        </Button>
      </div>
      <div className="mt-3 space-y-2">
        <FormField label={t('moderatorNote')}>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        </FormField>
        <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-slate-300">
          <input type="checkbox" checked={strike} onChange={(e) => setStrike(e.target.checked)} />
          {t('applyStrike')}
        </label>
      </div>
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
    </li>
  );
}

function ReportCard({
  report,
  token,
  onDone,
}: {
  report: ModerationReportRecord;
  token: string;
  onDone: () => void;
}) {
  const t = useTranslations('community.moderation');
  const [note, setNote] = useState('');
  const [strike, setStrike] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const resolve = async (status: 'RESOLVED' | 'DISMISSED') => {
    setBusy(true);
    setError('');
    try {
      await apiClient.community.resolveReport(
        report.id,
        {
          status,
          moderatorNote: note.trim() || undefined,
          applyStrikeToTargetAuthor: status === 'RESOLVED' ? strike : false,
        },
        token,
      );
      onDone();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  const preview = report.targetPreview;

  return (
    <li className="rounded-2xl border border-stone-200/80 bg-stone-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-stone-400">{t('reportedBy')}</p>
          <p className="text-sm font-semibold text-family-ink dark:text-white">
            {report.reporter?.displayName ?? report.reporterId}
          </p>
          <p className="text-xs text-stone-500">{new Date(report.createdAt).toLocaleString()}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={categoryTone(report.category)}>{t(`category.${report.category}`)}</Badge>
          <Badge tone={reportStatusTone(report.status)}>{t(`status.${report.status}`)}</Badge>
        </div>
      </div>
      <p className="mt-2 text-xs text-stone-500">
        {t('target', { type: report.targetType, id: report.targetId.slice(0, 8) })}
      </p>
      {report.details && (
        <p className="mt-2 text-sm italic text-stone-700 dark:text-slate-300">&ldquo;{report.details}&rdquo;</p>
      )}
      {preview?.content && (
        <div className="mt-3 rounded-xl border border-stone-200/60 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-900/60">
          {preview.threadTitle && (
            <p className="text-xs text-stone-500">
              {preview.groupTitle} · {preview.threadTitle}
            </p>
          )}
          <p className="mt-1 whitespace-pre-wrap text-sm text-stone-800 dark:text-slate-200">{preview.content}</p>
          {preview.authorName && (
            <p className="mt-2 text-xs text-stone-500">{t('author', { name: preview.authorName })}</p>
          )}
        </div>
      )}
      {preview?.threadId && (
        <Link href={`/community/threads/${preview.threadId}`} className="mt-2 inline-block text-sm text-family-accent">
          {t('openThread')}
        </Link>
      )}
      <div className="mt-4 space-y-2">
        <FormField label={t('moderatorNote')}>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        </FormField>
        <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-slate-300">
          <input type="checkbox" checked={strike} onChange={(e) => setStrike(e.target.checked)} />
          {t('applyStrikeOnResolve')}
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="primary" type="button" disabled={busy} onClick={() => void resolve('RESOLVED')}>
          {t('uphold')}
        </Button>
        <Button variant="secondary" type="button" disabled={busy} onClick={() => void resolve('DISMISSED')}>
          {t('dismiss')}
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
    </li>
  );
}

export function CommunityModerationQueuePage() {
  const { session, isReady } = useAuth();
  const t = useTranslations('community.moderation');
  const [queue, setQueue] = useState<ModerationQueueResponse | null>(null);
  const [tab, setTab] = useState<QueueTab>('pending');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isAdmin = session?.user.role === 'ADMIN';
  const token = session?.accessToken ?? null;

  const load = useCallback(async () => {
    if (!token || !isAdmin) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiClient.community.moderationQueue(token);
      setQueue(data);
    } catch (err) {
      setError(formatApiError(err));
      setQueue(null);
    } finally {
      setLoading(false);
    }
  }, [token, isAdmin]);

  useEffect(() => {
    if (!isReady) return;
    void load();
  }, [isReady, load]);

  const filteredReports = useMemo(() => {
    const reports = queue?.reports ?? [];
    if (categoryFilter === 'ALL') return reports;
    return reports.filter((r) => r.category === categoryFilter);
  }, [queue?.reports, categoryFilter]);

  if (!isReady) return null;

  if (!session?.accessToken) {
    return (
      <EmptyState title={t('loginRequiredTitle')} description={t('loginRequiredHint')} />
    );
  }

  if (!isAdmin || !token) {
    return (
      <EmptyState title={t('forbiddenTitle')} description={t('forbiddenHint')} />
    );
  }

  const adminToken = token;
  const stats = queue?.stats ?? { openReports: 0, underReview: 0, pendingPosts: 0 };

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('title')}
        description={t('description')}
        action={
          <Link href="/community">
            <Button variant="secondary">{t('back')}</Button>
          </Link>
        }
      />

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label={t('statPending')} value={String(stats.pendingPosts)} hint={t('statPendingHint')} />
        <StatCard label={t('statOpen')} value={String(stats.openReports)} hint={t('statOpenHint')} />
        <StatCard label={t('statReview')} value={String(stats.underReview)} hint={t('statReviewHint')} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={tab === 'pending' ? 'primary' : 'secondary'}
          type="button"
          onClick={() => setTab('pending')}
        >
          {t('tabPending')} ({stats.pendingPosts})
        </Button>
        <Button
          variant={tab === 'reports' ? 'primary' : 'secondary'}
          type="button"
          onClick={() => setTab('reports')}
        >
          {t('tabReports')} ({queue?.reports.length ?? 0})
        </Button>
        <Button variant="ghost" type="button" onClick={() => void load()} disabled={loading}>
          {t('refresh')}
        </Button>
      </div>

      {loading && <p className="text-sm text-stone-500">{t('loading')}</p>}

      {tab === 'pending' && (
        <Card className="space-y-4">
          <p className="text-xs uppercase tracking-[0.25em] text-stone-400">{t('pendingEyebrow')}</p>
          {!loading && (queue?.pendingPosts.length ?? 0) === 0 ? (
            <p className="text-sm text-stone-500">{t('emptyPending')}</p>
          ) : (
            <ul className="space-y-4">
              {(queue?.pendingPosts ?? []).map((post) => (
                <PendingPostCard key={post.id} post={post} token={adminToken} onDone={() => void load()} />
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === 'reports' && (
        <Card className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <p className="text-xs uppercase tracking-[0.25em] text-stone-400">{t('reportsEyebrow')}</p>
            <FormField label={t('filterCategory')} className="sm:w-56">
              <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="ALL">{t('categoryAll')}</option>
                {(
                  [
                    'SPAM',
                    'HARASSMENT',
                    'PERSONAL_DATA_LIVING',
                    'MISINFORMATION',
                    'OFF_TOPIC',
                    'COPYRIGHT',
                    'OTHER',
                  ] as ModerationReportCategory[]
                ).map((c) => (
                  <option key={c} value={c}>
                    {t(`category.${c}`)}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
          {!loading && filteredReports.length === 0 ? (
            <p className="text-sm text-stone-500">{t('emptyReports')}</p>
          ) : (
            <ul className="space-y-4">
              {filteredReports.map((report) => (
                <ReportCard key={report.id} report={report} token={adminToken} onDone={() => void load()} />
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
