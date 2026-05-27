'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { useFormatApiError } from '@/lib/use-format-api-error';

interface DocumentIntelligenceModalProps {
  documentId: string;
  documentTitle?: string | null;
  token: string | null;
  onClose: () => void;
}

export function DocumentIntelligenceModal({ documentId, documentTitle, token, onClose }: DocumentIntelligenceModalProps) {
  const t = useTranslations('documentIntelligence');
  const formatApiError = useFormatApiError();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [summary, setSummary] = useState<{ text: string; uncertainty: number | null } | null>(null);

  const loadSummary = useCallback(async () => {
    if (!documentId || !token) return;
    try {
      const r = (await apiClient.documentIntelligence.results(documentId, token)) as {
        analysis: { summary?: Record<string, unknown> } | null;
      };
      const s = r.analysis?.summary;
      if (s && typeof s === 'object') {
        setSummary({
          text: (s.summary as string) ?? '',
          uncertainty: typeof s.uncertaintyScore === 'number' ? s.uncertaintyScore : null,
        });
      } else {
        setSummary(null);
      }
    } catch (e) {
      setStatus(formatApiError(e));
    }
  }, [documentId, token, formatApiError]);

  useEffect(() => {
    if (documentId && token) void loadSummary();
  }, [documentId, token, loadSummary]);

  async function runQuickPipeline() {
    if (!token) {
      setStatus(t('needLogin'));
      return;
    }
    setBusy(true);
    setStatus('');
    try {
      await apiClient.documentIntelligence.ocr({ documentId }, token);
      await apiClient.documentIntelligence.entities({ documentId }, token);
      await apiClient.documentIntelligence.events({ documentId }, token);
      await apiClient.documentIntelligence.relationships({ documentId }, token);
      await apiClient.documentIntelligence.summary({ documentId }, token);
      await loadSummary();
      setStatus(t('pipelineDone'));
    } catch (e) {
      setStatus(formatApiError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-950">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-family-ink dark:text-white">{t('modalTitle')}</h2>
            <p className="mt-1 text-sm text-stone-600 dark:text-slate-400">{documentTitle ?? documentId}</p>
          </div>
          <Button variant="ghost" type="button" onClick={onClose}>
            {t('close')}
          </Button>
        </div>

        <p className="text-xs text-stone-500 dark:text-slate-400">{t('modalHint')}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="primary" type="button" disabled={busy || !token} onClick={() => void runQuickPipeline()}>
            {t('runQuickPipeline')}
          </Button>
          <Link
            href={`/documents/${documentId}/intelligence`}
            onClick={onClose}
            className={cn(
              'inline-flex items-center justify-center rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-family-primary transition hover:-translate-y-0.5 hover:bg-stone-50 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800',
            )}
          >
            {t('openFullAnalysis')}
          </Link>
        </div>

        {summary ? (
          <div className="mt-5 rounded-2xl border bg-stone-50 p-4 text-sm dark:bg-slate-900">
            {summary.uncertainty != null ? (
              <p className="text-xs text-stone-500 dark:text-slate-400">
                {t('uncertainty')}: {(summary.uncertainty * 100).toFixed(0)}%
              </p>
            ) : null}
            <p className="mt-2 text-stone-800 dark:text-slate-100">{summary.text || '—'}</p>
          </div>
        ) : null}

        {status ? <p className="mt-3 text-sm text-stone-600 dark:text-slate-300">{status}</p> : null}
      </div>
    </div>
  );
}
