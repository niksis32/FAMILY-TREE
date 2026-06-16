'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/components/auth-provider';
import { Button, Input } from '@/components/ui';
import { PageHero } from '@family/ui';
import { apiClient, formatApiError } from '@/lib/api-client';

export function ArchivesSearchPage() {
  const { session, isReady } = useAuth();
  const t = useTranslations('block5.archives');
  const [providers, setProviders] = useState<unknown[]>([]);
  const [familyName, setFamilyName] = useState('');
  const [givenName, setGivenName] = useState('');
  const [results, setResults] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadProviders = useCallback(async () => {
    if (!session?.accessToken) return;
    try {
      const rows = await apiClient.externalArchives.providers(session.accessToken);
      setProviders(rows);
    } catch (err) {
      setError(formatApiError(err));
    }
  }, [session?.accessToken]);

  useEffect(() => {
    if (!isReady) return;
    void loadProviders();
  }, [isReady, loadProviders]);

  async function runSearch() {
    if (!session?.accessToken) return;
    setLoading(true);
    setError('');
    try {
      const started = await apiClient.externalArchives.search(
        { provider: 'FAMILYSEARCH', familyName, givenName },
        session.accessToken,
      ) as { searchId?: string; id?: string };
      const searchId = started.searchId ?? started.id;
      if (!searchId) throw new Error('No searchId');
      for (let i = 0; i < 15; i++) {
        await new Promise((r) => setTimeout(r, 800));
        const poll = await apiClient.externalArchives.getSearch(searchId, session.accessToken) as {
          status?: string;
          results?: unknown[];
        };
        if (poll.status === 'COMPLETED' || poll.results) {
          setResults(Array.isArray(poll.results) ? poll.results : []);
          break;
        }
        if (poll.status === 'FAILED') break;
      }
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }

  async function importRecord(recordId: string) {
    if (!session?.accessToken) return;
    try {
      await apiClient.externalArchives.importRecord(
        { provider: 'FAMILYSEARCH', recordId },
        session.accessToken,
      );
      alert(t('importSuccess'));
    } catch (err) {
      setError(formatApiError(err));
    }
  }

  return (
    <div className="space-y-6">
      <PageHero eyebrow={t('eyebrow')} title={t('title')} description={t('description')} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid gap-3 md:grid-cols-3">
        <Input placeholder={t('givenName')} value={givenName} onChange={(e) => setGivenName(e.target.value)} />
        <Input placeholder={t('familyName')} value={familyName} onChange={(e) => setFamilyName(e.target.value)} />
        <Button onClick={() => void runSearch()} disabled={loading}>{loading ? t('searching') : t('search')}</Button>
      </div>
      <p className="text-sm text-stone-500">{t('providers')}: {providers.length}</p>
      <ul className="space-y-3">
        {results.map((row, idx) => {
          const r = row as { externalId?: string; recordId?: string; title?: string; summary?: string };
          const id = r.externalId ?? r.recordId ?? String(idx);
          return (
            <li key={id} className="rounded-lg border p-4 dark:border-slate-700">
              <p className="font-medium">{r.title ?? id}</p>
              {r.summary && <p className="mt-1 text-sm text-stone-600">{r.summary}</p>}
              <Button className="mt-3" variant="secondary" size="sm" onClick={() => void importRecord(id)}>
                {t('import')}
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
