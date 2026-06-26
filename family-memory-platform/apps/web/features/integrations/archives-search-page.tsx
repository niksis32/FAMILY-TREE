'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/components/auth-provider';
import { Button, Input } from '@/components/ui';
import { PageHero } from '@family/ui';
import { apiClient, formatApiError } from '@/lib/api-client';

type ArchiveRecord = {
  externalId?: string;
  recordId?: string;
  title?: string;
  summary?: string;
  place?: string;
  year?: number;
  permalink?: string;
  attributionText?: string;
};

export function ArchivesSearchPage() {
  const { session, isReady } = useAuth();
  const t = useTranslations('block5.archives');
  const [providers, setProviders] = useState<unknown[]>([]);
  const [quota, setQuota] = useState<{ quota: number; used: number; remaining: number } | null>(null);
  const [familyName, setFamilyName] = useState('');
  const [givenName, setGivenName] = useState('');
  const [results, setResults] = useState<ArchiveRecord[]>([]);
  const [preview, setPreview] = useState<ArchiveRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadProviders = useCallback(async () => {
    if (!session?.accessToken) return;
    try {
      const [rows, q] = await Promise.all([
        apiClient.externalArchives.providers(session.accessToken),
        apiClient.externalArchives.quota(session.accessToken),
      ]);
      setProviders(rows);
      setQuota(q);
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
          results?: ArchiveRecord[];
        };
        if (poll.status === 'COMPLETED' || poll.results) {
          setResults(Array.isArray(poll.results) ? poll.results : []);
          break;
        }
        if (poll.status === 'FAILED') break;
      }
      await loadProviders();
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
      setPreview(null);
    } catch (err) {
      setError(formatApiError(err));
    }
  }

  return (
    <div className="space-y-6">
      <PageHero eyebrow={t('eyebrow')} title={t('title')} description={t('description')} />
      <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
        {t('tosBanner')}
      </p>
      {quota ? (
        <p className="text-sm text-stone-500">
          {t('quota')}: {quota.used}/{quota.quota} ({quota.remaining} {t('remaining')})
        </p>
      ) : null}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid gap-3 md:grid-cols-3">
        <Input placeholder={t('givenName')} value={givenName} onChange={(e) => setGivenName(e.target.value)} />
        <Input placeholder={t('familyName')} value={familyName} onChange={(e) => setFamilyName(e.target.value)} />
        <Button onClick={() => void runSearch()} disabled={loading || (quota?.remaining === 0)}>
          {loading ? t('searching') : t('search')}
        </Button>
      </div>
      <p className="text-sm text-stone-500">{t('providers')}: {providers.length}</p>
      <ul className="space-y-3">
        {results.map((row, idx) => {
          const id = row.externalId ?? row.recordId ?? String(idx);
          return (
            <li key={id} className="rounded-lg border p-4 dark:border-slate-700">
              <p className="font-medium">{row.title ?? id}</p>
              {row.summary && <p className="mt-1 text-sm text-stone-600">{row.summary}</p>}
              <div className="mt-3 flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setPreview(row)}>
                  {t('preview')}
                </Button>
                <Button size="sm" onClick={() => void importRecord(id)}>
                  {t('import')}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {preview ? (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-950">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-lg font-semibold">{preview.title}</h2>
            <Button variant="secondary" size="sm" onClick={() => setPreview(null)}>
              {t('dismiss')}
            </Button>
          </div>
          {preview.summary ? <p className="mt-3 text-sm">{preview.summary}</p> : null}
          {preview.place ? <p className="mt-2 text-sm text-stone-500">{preview.place}</p> : null}
          {preview.year ? <p className="mt-1 text-sm text-stone-500">{preview.year}</p> : null}
          {preview.permalink ? (
            <a className="mt-3 block text-sm text-blue-600 underline" href={preview.permalink} target="_blank" rel="noreferrer">
              {t('sourceLink')}
            </a>
          ) : null}
          {preview.attributionText ? (
            <p className="mt-4 text-xs text-stone-500">{preview.attributionText}</p>
          ) : null}
          <Button
            className="mt-6"
            onClick={() => void importRecord(preview.externalId ?? preview.recordId ?? '')}
          >
            {t('import')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
