'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { BibliographyExport, EvidenceCitationSummary } from '@family/shared';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui';
import { PageHero } from '@family/ui';
import { apiClient, formatApiError } from '@/lib/api-client';

export function EvidencePage() {
  const { session, isReady } = useAuth();
  const t = useTranslations('evidence');
  const [citations, setCitations] = useState<EvidenceCitationSummary[]>([]);
  const [exportData, setExportData] = useState<BibliographyExport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!session?.accessToken) return;
    setLoading(true);
    setError('');
    try {
      const rows = await apiClient.evidence.listCitations(session.accessToken);
      setCitations(rows);
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

  async function exportBibliography(format: 'text' | 'bibtex' | 'json') {
    if (!session?.accessToken) return;
    try {
      const data = await apiClient.evidence.exportBibliography(session.accessToken, format);
      setExportData(data);
    } catch (err) {
      setError(formatApiError(err));
    }
  }

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={t('eyebrow')}
        title={t('title')}
        description={t('description')}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => void exportBibliography('text')}>{t('exportText')}</Button>
            <Button variant="secondary" onClick={() => void exportBibliography('bibtex')}>{t('exportBibtex')}</Button>
          </div>
        }
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? <p>{t('loading')}</p> : null}
      <ul className="space-y-3">
        {citations.map((c) => (
          <li key={c.id} className="rounded-xl border border-stone-200 p-4 dark:border-slate-700">
            <div className="flex justify-between gap-2">
              <div>
                <h3 className="font-semibold">{c.sourceTitle}</h3>
                {c.formattedCitation ? <p className="mt-1 text-sm">{c.formattedCitation}</p> : null}
                {c.eventId ? <p className="mt-1 text-xs text-stone-500">{t('linkedEvent')}: {c.eventId}</p> : null}
              </div>
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{c.qualityScore}</span>
            </div>
          </li>
        ))}
        {!loading && !citations.length ? <li className="text-stone-500">{t('empty')}</li> : null}
      </ul>
      {exportData ? (
        <pre className="max-h-64 overflow-auto rounded-lg bg-stone-100 p-3 text-xs dark:bg-slate-900">
          {exportData.entries.map((e) => e.formatted).join('\n\n')}
        </pre>
      ) : null}
    </div>
  );
}
