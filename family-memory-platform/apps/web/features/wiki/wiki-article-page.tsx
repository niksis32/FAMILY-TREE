'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/components/auth-provider';
import { PageHero } from '@family/ui';
import { apiClient, formatApiError } from '@/lib/api-client';
import { WikiMarkdown } from './wiki-markdown';
import { WikiRevisionDiff } from './wiki-revision-diff';

export function WikiArticlePage({ slug }: { slug: string }) {
  const { session, isReady } = useAuth();
  const t = useTranslations('wiki');
  const [page, setPage] = useState<Awaited<ReturnType<typeof apiClient.wiki.getBySlug>> | null>(null);
  const [error, setError] = useState('');
  const [compareVersion, setCompareVersion] = useState<number | null>(null);

  useEffect(() => {
    if (!isReady || !session?.accessToken) return;
    void apiClient.wiki.getBySlug(slug, session.accessToken)
      .then(setPage)
      .catch((err) => setError(formatApiError(err)));
  }, [isReady, session?.accessToken, slug]);

  const revisions = page?.revisions ?? [];
  const latest = page?.latestRevision ?? revisions[0];
  const sortedRevisions = useMemo(
    () => [...revisions].sort((a, b) => b.version - a.version),
    [revisions],
  );

  const comparePair = useMemo(() => {
    if (compareVersion == null || !latest) return null;
    const older = sortedRevisions.find((r) => r.version === compareVersion);
    if (!older || older.version === latest.version) return null;
    return { older, newer: latest };
  }, [compareVersion, latest, sortedRevisions]);

  return (
    <div className="space-y-6">
      <PageHero eyebrow={t('eyebrow')} title={page?.title ?? slug} description={`/${slug}`} />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {latest ? (
        <>
          <div className="rounded-xl border border-stone-200 p-6 dark:border-slate-700">
            <WikiMarkdown content={latest.content} />
            <p className="mt-4 text-xs text-stone-500">{t('version')}: {latest.version}</p>
          </div>

          {sortedRevisions.length > 1 ? (
            <section className="space-y-3">
              <h3 className="font-semibold">{t('revisionHistory')}</h3>
              <ul className="space-y-2 text-sm">
                {sortedRevisions.map((rev) => (
                  <li key={rev.id} className="flex flex-wrap items-center gap-2">
                    <span>v{rev.version}</span>
                    <span className="text-stone-500">{new Date(rev.createdAt).toLocaleString()}</span>
                    {rev.version !== latest.version ? (
                      <button
                        type="button"
                        className="text-amber-800 underline dark:text-amber-200"
                        onClick={() => setCompareVersion(rev.version)}
                      >
                        {t('compareWithLatest')}
                      </button>
                    ) : (
                      <span className="text-emerald-700 dark:text-emerald-300">{t('current')}</span>
                    )}
                  </li>
                ))}
              </ul>
              {comparePair ? (
                <WikiRevisionDiff
                  before={comparePair.older.content}
                  after={comparePair.newer.content}
                  beforeLabel={`v${comparePair.older.version}`}
                  afterLabel={`v${comparePair.newer.version}`}
                />
              ) : null}
            </section>
          ) : null}
        </>
      ) : (
        <p>{t('loading')}</p>
      )}
    </div>
  );
}
