'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/components/auth-provider';
import { PageHero } from '@family/ui';
import { apiClient, formatApiError } from '@/lib/api-client';

export function WikiArticlePage({ slug }: { slug: string }) {
  const { session, isReady } = useAuth();
  const t = useTranslations('wiki');
  const [page, setPage] = useState<Awaited<ReturnType<typeof apiClient.wiki.getBySlug>> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isReady || !session?.accessToken) return;
    void apiClient.wiki.getBySlug(slug, session.accessToken)
      .then(setPage)
      .catch((err) => setError(formatApiError(err)));
  }, [isReady, session?.accessToken, slug]);

  const latest = page?.latestRevision ?? page?.revisions?.[0];

  return (
    <div className="space-y-6">
      <PageHero eyebrow={t('eyebrow')} title={page?.title ?? slug} description={`/${slug}`} />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {latest ? (
        <article className="prose max-w-none rounded-xl border border-stone-200 p-6 dark:border-slate-700 dark:prose-invert">
          <pre className="whitespace-pre-wrap font-sans text-sm">{latest.content}</pre>
          <p className="mt-4 text-xs text-stone-500">{t('version')}: {latest.version}</p>
        </article>
      ) : (
        <p>{t('loading')}</p>
      )}
    </div>
  );
}
