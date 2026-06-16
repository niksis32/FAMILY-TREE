'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { WikiPageSummary } from '@family/shared';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui';
import { PageHero } from '@family/ui';
import { apiClient, formatApiError } from '@/lib/api-client';

export function WikiPageList() {
  const { session, isReady } = useAuth();
  const t = useTranslations('wiki');
  const [pages, setPages] = useState<WikiPageSummary[]>([]);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!session?.accessToken) return;
    setLoading(true);
    setError('');
    try {
      const rows = await apiClient.wiki.list(session.accessToken);
      setPages(rows);
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

  async function createPage() {
    if (!session?.accessToken || !title.trim() || !slug.trim()) return;
    try {
      await apiClient.wiki.create(
        { title: title.trim(), slug: slug.trim(), content: content.trim() || t('defaultContent') },
        session.accessToken,
      );
      setTitle('');
      setSlug('');
      setContent('');
      void load();
    } catch (err) {
      setError(formatApiError(err));
    }
  }

  return (
    <div className="space-y-6">
      <PageHero eyebrow={t('eyebrow')} title={t('title')} description={t('description')} />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <section className="rounded-xl border border-stone-200 p-4 dark:border-slate-700">
        <h3 className="font-semibold">{t('createTitle')}</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <input className="rounded-lg border px-3 py-2 dark:border-slate-700 dark:bg-slate-900" placeholder={t('pageTitle')} value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className="rounded-lg border px-3 py-2 dark:border-slate-700 dark:bg-slate-900" placeholder={t('slug')} value={slug} onChange={(e) => setSlug(e.target.value)} />
        </div>
        <textarea className="mt-2 w-full rounded-lg border px-3 py-2 dark:border-slate-700 dark:bg-slate-900" rows={4} placeholder={t('contentHint')} value={content} onChange={(e) => setContent(e.target.value)} />
        <Button className="mt-2" onClick={() => void createPage()}>{t('create')}</Button>
      </section>
      {loading ? <p>{t('loading')}</p> : null}
      <ul className="space-y-2">
        {pages.map((p) => (
          <li key={p.id} className="rounded-lg border border-stone-100 p-3 dark:border-slate-800">
            <Link href={`/wiki/${p.slug}`} className="font-medium hover:underline">{p.title}</Link>
            <p className="text-xs text-stone-500">/{p.slug} · v{p.latestRevision?.version ?? 1}</p>
          </li>
        ))}
        {!loading && !pages.length ? <li className="text-stone-500">{t('empty')}</li> : null}
      </ul>
    </div>
  );
}
