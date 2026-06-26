'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { HintSummary } from '@family/shared';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui';
import { PageHero } from '@family/ui';
import { apiClient, formatApiError } from '@/lib/api-client';

export function HintsPage() {
  const { session, isReady } = useAuth();
  const t = useTranslations('hints');
  const [hints, setHints] = useState<HintSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!session?.accessToken) return;
    setLoading(true);
    setError('');
    try {
      await apiClient.hints.sync(session.accessToken);
      const rows = await apiClient.hints.list(session.accessToken);
      setHints(rows);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken]);

  useEffect(() => {
    if (!isReady) return;
    void load();
  }, [isReady, load]);

  async function accept(id: string) {
    if (!session?.accessToken) return;
    await apiClient.hints.accept(id, session.accessToken);
    void load();
  }

  async function dismiss(id: string) {
    if (!session?.accessToken) return;
    await apiClient.hints.dismiss(id, session.accessToken);
    void load();
  }

  return (
    <div className="space-y-6">
      <PageHero eyebrow={t('eyebrow')} title={t('title')} description={t('description')} action={<Button variant="secondary" onClick={() => void load()}>{t('refresh')}</Button>} />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? <p>{t('loading')}</p> : null}
      <ul className="space-y-3">
        {hints.map((hint) => (
          <li key={hint.id} className="rounded-xl border border-stone-200 p-4 dark:border-slate-700">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <span className="text-xs uppercase text-amber-700 dark:text-amber-300">{hint.source}</span>
                <h3 className="font-semibold">{hint.title}</h3>
                {hint.summary ? <p className="mt-1 text-sm text-stone-600 dark:text-slate-300">{hint.summary}</p> : null}
              </div>
              <span className="text-sm text-stone-500">{Math.round(hint.score * 100)}%</span>
            </div>
            {hint.reasons.length ? (
              <ul className="mt-2 space-y-1 text-sm text-stone-600 dark:text-slate-400">
                {hint.reasons.map((r) => (
                  <li key={r.code}>• {r.label}</li>
                ))}
              </ul>
            ) : null}
            <div className="mt-3 flex gap-2">
              {hint.source === 'MATCHING' ? (
                <Link href="/merge" className="text-sm text-amber-800 underline dark:text-amber-200">
                  {t('openMerge')}
                </Link>
              ) : null}
              <Button size="sm" onClick={() => void accept(hint.id)}>{t('accept')}</Button>
              <Button size="sm" variant="secondary" onClick={() => void dismiss(hint.id)}>{t('dismiss')}</Button>
            </div>
          </li>
        ))}
        {!loading && !hints.length ? <li className="text-stone-500">{t('empty')}</li> : null}
      </ul>
    </div>
  );
}
