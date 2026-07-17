'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { AdminMilitaryConflictPending } from '@family/shared';
import { useAuth } from '@/components/auth-provider';
import { Button, Card, Input } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { apiClient, formatApiError } from '@/lib/api-client';
import { notifyAdminModerationChanged } from '@/features/admin/use-admin-moderation-queues';
import { cn } from '@/lib/utils';

const CONFLICT_NAME_PATTERN = /^[\p{L}\p{N}\s.,\-–—()'"/]{2,120}$/u;

export function AdminMilitaryModerationPage() {
  const { session } = useAuth();
  const t = useTranslations('adminPanel.militaryModeration');
  const tMil = useTranslations('militaryHistory');
  const searchParams = useSearchParams();
  const reviewFocusId = searchParams.get('review');
  const [items, setItems] = useState<AdminMilitaryConflictPending[]>([]);
  const [reviewEdits, setReviewEdits] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.accessToken) return;
    setLoading(true);
    setError('');
    try {
      const pending = await apiClient.admin.listPendingMilitaryConflicts(session.accessToken);
      setItems(pending);
      setReviewEdits(Object.fromEntries(pending.map((row) => [row.id, row.name])));
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleApprove(id: string) {
    if (!session?.accessToken) return;
    const name = (reviewEdits[id] ?? '').trim().replace(/\s+/g, ' ');
    if (!CONFLICT_NAME_PATTERN.test(name)) {
      setError(tMil('conflictNameInvalid'));
      return;
    }
    setBusyId(id);
    setError('');
    try {
      await apiClient.admin.approveMilitaryConflict(session.accessToken, id, { name });
      setItems((prev) => prev.filter((item) => item.id !== id));
      setNotice(t('approved'));
      notifyAdminModerationChanged();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id: string) {
    if (!session?.accessToken) return;
    setBusyId(id);
    setError('');
    try {
      await apiClient.admin.rejectMilitaryConflict(session.accessToken, id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      setNotice(t('rejected'));
      notifyAdminModerationChanged();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl font-semibold">{t('title')}</h2>
            <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">{t('hint')}</p>
          </div>
          <Link href="/admin/moderation">
            <Button variant="secondary">{t('backToHub')}</Button>
          </Link>
        </div>
      </Card>

      {notice ? <p className="text-sm text-emerald-700 dark:text-emerald-300">{notice}</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {loading ? <p className="text-sm text-stone-500">{t('loading')}</p> : null}

      {!loading && items.length === 0 ? (
        <Card className="p-5 text-sm text-stone-500 dark:text-slate-400">{t('empty')}</Card>
      ) : null}

      {items.length > 0 ? (
        <Card className="space-y-4 border-amber-300/60 p-4 dark:border-amber-700/50">
          <div>
            <p className="font-serif text-lg font-semibold text-family-ink dark:text-white">{tMil('pendingReviewTitle')}</p>
            <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">{tMil('pendingReviewHint')}</p>
          </div>
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                className={cn(
                  'rounded-2xl border p-4',
                  reviewFocusId === item.id
                    ? 'border-amber-400 bg-amber-50/80 dark:bg-amber-950/20'
                    : 'border-stone-200/70 dark:border-slate-700',
                )}
              >
                <p className="mb-1 text-xs font-medium text-stone-500">
                  {t('workspaceLabel', { name: item.workspaceName })}
                </p>
                {item.proposerLabel ? (
                  <p className="mb-2 text-xs text-stone-500">{tMil('proposedBy', { name: item.proposerLabel })}</p>
                ) : null}
                <Input
                  value={reviewEdits[item.id] ?? item.name}
                  maxLength={120}
                  aria-label={tMil('newConflictName')}
                  onChange={(event) =>
                    setReviewEdits((prev) => ({
                      ...prev,
                      [item.id]: event.target.value,
                    }))
                  }
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button disabled={busyId === item.id} onClick={() => void handleApprove(item.id)}>
                    {tMil('editAndApprove')}
                  </Button>
                  <Button variant="secondary" disabled={busyId === item.id} onClick={() => void handleReject(item.id)}>
                    {tMil('rejectConflict')}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
