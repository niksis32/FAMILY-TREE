'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { FacetedSearchResults, SearchHistorySummary, SavedSearchSummary, SearchHit } from '@family/shared';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui';
import { PageHero } from '@family/ui';
import { apiClient, formatApiError } from '@/lib/api-client';

const CATEGORIES = ['people', 'documents', 'places', 'sources', 'wiki', 'evidence'] as const;

export function AdvancedSearchPage() {
  const { session, isReady } = useAuth();
  const t = useTranslations('advancedSearch');
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<string>('');
  const [results, setResults] = useState<FacetedSearchResults | null>(null);
  const [allHits, setAllHits] = useState<SearchHit[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedSearchSummary[]>([]);
  const [history, setHistory] = useState<SearchHistorySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadMeta = useCallback(async () => {
    if (!session?.accessToken) return;
    try {
      const [savedRows, historyRows] = await Promise.all([
        apiClient.searchAdvanced.saved(session.accessToken),
        apiClient.searchAdvanced.history(session.accessToken),
      ]);
      setSaved(savedRows);
      setHistory(historyRows);
    } catch {
      /* optional */
    }
  }, [session?.accessToken]);

  const runSearch = useCallback(async (cursor?: string) => {
    if (!session?.accessToken || !q.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiClient.searchAdvanced.faceted(session.accessToken, {
        q: q.trim(),
        ...(category ? { categories: category } : {}),
        ...(cursor ? { cursor } : {}),
        limit: 20,
      });
      setResults(data);
      setNextCursor(data.nextCursor ?? null);
      setAllHits((prev) => (cursor ? [...prev, ...data.hits] : data.hits));
      if (!cursor) void loadMeta();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken, q, category, loadMeta]);

  useEffect(() => {
    if (!isReady) return;
    void loadMeta();
  }, [isReady, loadMeta]);

  async function saveSearch() {
    if (!session?.accessToken || !q.trim()) return;
    try {
      await apiClient.searchAdvanced.createSaved(
        { name: q.trim().slice(0, 40), query: q.trim(), filters: category ? { categories: [category as never] } : undefined },
        session.accessToken,
      );
      void loadMeta();
    } catch (err) {
      setError(formatApiError(err));
    }
  }

  return (
    <div className="space-y-6">
      <PageHero eyebrow={t('eyebrow')} title={t('title')} description={t('description')} />
      <div className="flex flex-wrap gap-2">
        <input
          className="min-w-[240px] flex-1 rounded-lg border border-stone-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('placeholder')}
          onKeyDown={(e) => e.key === 'Enter' && void runSearch()}
        />
        <select
          className="rounded-lg border border-stone-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">{t('allCategories')}</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{t(`category.${c}`)}</option>
          ))}
        </select>
        <Button onClick={() => void runSearch()} disabled={loading}>{t('search')}</Button>
        <Button variant="secondary" onClick={() => void saveSearch()}>{t('saveSearch')}</Button>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {results ? (
        <section className="rounded-xl border border-stone-200 p-4 dark:border-slate-700">
          <p className="text-sm text-stone-500">{t('results', { count: results.total })}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(results.facets.categories).map(([cat, n]) => (
              <span key={cat} className="rounded-full bg-stone-100 px-2 py-1 text-xs dark:bg-slate-800">
                {t(`category.${cat}`)}: {n}
              </span>
            ))}
          </div>
          <ul className="mt-4 space-y-2">
            {allHits.map((hit) => (
              <li key={hit.id} className="rounded-lg border border-stone-100 p-3 dark:border-slate-800">
                <div className="text-xs uppercase text-stone-500">{t(`category.${hit.category}`)}</div>
                <div className="font-medium">{hit.title}</div>
                {hit.text ? <p className="mt-1 text-sm text-stone-600 dark:text-slate-300">{hit.text.slice(0, 160)}</p> : null}
              </li>
            ))}
          </ul>
          {nextCursor ? (
            <Button className="mt-4" variant="secondary" disabled={loading} onClick={() => void runSearch(nextCursor)}>
              {t('loadMore')}
            </Button>
          ) : null}
        </section>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-stone-200 p-4 dark:border-slate-700">
          <h3 className="font-semibold">{t('savedTitle')}</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {saved.map((s) => (
              <li key={s.id}>
                <button type="button" className="text-left text-amber-800 hover:underline dark:text-amber-200" onClick={() => { setQ(s.query); void runSearch(); }}>
                  {s.name}
                </button>
              </li>
            ))}
            {!saved.length ? <li className="text-stone-500">{t('emptySaved')}</li> : null}
          </ul>
        </section>
        <section className="rounded-xl border border-stone-200 p-4 dark:border-slate-700">
          <h3 className="font-semibold">{t('historyTitle')}</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {history.map((h) => (
              <li key={h.id}>
                <button type="button" className="text-left hover:underline" onClick={() => { setQ(h.query); void runSearch(); }}>
                  {h.query} {h.resultCount != null ? `(${h.resultCount})` : ''}
                </button>
              </li>
            ))}
            {!history.length ? <li className="text-stone-500">{t('emptyHistory')}</li> : null}
          </ul>
        </section>
      </div>
      <p className="text-sm text-stone-500">
        <Link href="/wiki" className="underline">{t('wikiLink')}</Link>
        {' · '}
        <Link href="/evidence" className="underline">{t('evidenceLink')}</Link>
      </p>
    </div>
  );
}
