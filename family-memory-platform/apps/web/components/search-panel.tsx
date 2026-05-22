'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/components/auth-provider';
import { Button, Card, Input } from '@/components/ui';
import { apiClient, type SearchResultItem, type SearchResults } from '@/lib/api-client';
import { useFormatApiError } from '@/lib/use-format-api-error';

const emptyResults: SearchResults = { q: '', people: [], documents: [], places: [], sources: [] };

export function SearchPanel() {
  const { session } = useAuth();
  const t = useTranslations('searchPanel');
  const formatApiError = useFormatApiError();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResults>(emptyResults);
  const [status, setStatus] = useState('');

  async function runSearch() {
    if (!q.trim()) return;
    setStatus(t('searching'));
    try {
      const data = await apiClient.search(q, session?.accessToken);
      setResults(data);
      const count = data.people.length + data.documents.length + data.places.length + data.sources.length;
      setStatus(t('found', { count }));
    } catch (error) {
      setStatus(formatApiError(error));
    }
  }

  const statusLine = status || t('enterQuery');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-3xl border bg-white/85 p-3 shadow-premium dark:bg-slate-900/80 md:flex-row">
        <Input
          className="border-transparent bg-transparent focus:border-family-accent"
          placeholder={t('placeholder')}
          value={q}
          onChange={(event) => setQ(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void runSearch();
          }}
        />
        <Button type="button" onClick={() => void runSearch()}>
          {t('search')}
        </Button>
      </div>
      <p className="text-sm text-stone-500 dark:text-slate-400">{statusLine}</p>

      <div className="grid gap-6 xl:grid-cols-2">
        <ResultGroup title={t('people')} items={results.people} noResults={t('noResults')} />
        <ResultGroup title={t('documents')} items={results.documents} noResults={t('noResults')} />
        <ResultGroup title={t('places')} items={results.places} noResults={t('noResults')} />
        <ResultGroup title={t('sources')} items={results.sources} noResults={t('noResults')} />
      </div>
    </div>
  );
}

function ResultGroup({
  title,
  items,
  noResults,
}: {
  title: string;
  items: SearchResultItem[];
  noResults: string;
}) {
  return (
    <Card className="p-5">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? <p className="text-sm text-stone-500 dark:text-slate-400">{noResults}</p> : null}
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl border bg-stone-50 p-4 dark:bg-slate-950">
            <p className="font-semibold">{item.title}</p>
            {item.text ? <p className="mt-2 line-clamp-2 text-sm text-stone-600 dark:text-slate-300">{item.text}</p> : null}
            {item.year ? <p className="mt-2 text-xs text-family-accent">{item.year}</p> : null}
          </div>
        ))}
      </div>
    </Card>
  );
}
