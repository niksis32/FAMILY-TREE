'use client';

import { useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Button, Card, Input } from '@/components/ui';
import { apiClient, type SearchResultItem, type SearchResults } from '@/lib/api-client';

const emptyResults: SearchResults = { q: '', people: [], documents: [], places: [], sources: [] };

export function SearchPanel() {
  const { session } = useAuth();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResults>(emptyResults);
  const [status, setStatus] = useState('Введите запрос для локального Meilisearch');

  async function runSearch() {
    if (!q.trim()) return;
    setStatus('Ищем...');
    try {
      const data = await apiClient.search(q, session?.accessToken);
      setResults(data);
      setStatus(`Найдено: ${data.people.length + data.documents.length + data.places.length + data.sources.length}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Ошибка поиска');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-3xl border bg-white/85 p-3 shadow-premium dark:bg-slate-900/80 md:flex-row">
        <Input
          className="border-transparent bg-transparent focus:border-family-accent"
          placeholder="Найти человека, документ, место или источник"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void runSearch();
          }}
        />
        <Button type="button" onClick={() => void runSearch()}>
          Искать
        </Button>
      </div>
      <p className="text-sm text-stone-500 dark:text-slate-400">{status}</p>

      <div className="grid gap-6 xl:grid-cols-2">
        <ResultGroup title="Люди" items={results.people} />
        <ResultGroup title="Документы" items={results.documents} />
        <ResultGroup title="Места" items={results.places} />
        <ResultGroup title="Источники" items={results.sources} />
      </div>
    </div>
  );
}

function ResultGroup({ title, items }: { title: string; items: SearchResultItem[] }) {
  return (
    <Card className="p-5">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? <p className="text-sm text-stone-500 dark:text-slate-400">Нет результатов</p> : null}
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
