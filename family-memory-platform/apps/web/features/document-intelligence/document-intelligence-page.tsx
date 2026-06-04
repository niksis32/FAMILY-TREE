'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button, Card, PageHeader } from '@/components/ui';
import { useAuth } from '@/components/auth-provider';
import { apiClient, type DocumentDownloadUrlResponse, type DocumentRecord } from '@/lib/api-client';
import { useFormatApiError } from '@/lib/use-format-api-error';
import { CitationCreator } from './citation-creator';
import { DocumentViewer } from './document-viewer';
import { EntityHighlighter } from './entity-highlighter';
import { OcrTextPanel } from './ocr-text-panel';
import { SuggestedEventsPanel } from './suggested-events-panel';
import { SuggestedRelationshipsPanel } from './suggested-relationships-panel';

type TabId = 'text' | 'events' | 'relationships' | 'citations';

function extractPlainTextFromOcr(ocr: unknown): string {
  if (!ocr || typeof ocr !== 'object') return '';
  const pages = (ocr as { pages?: Array<{ blocks?: Array<{ text?: string }> }> }).pages;
  if (!Array.isArray(pages)) return '';
  return pages
    .flatMap((p) => p.blocks ?? [])
    .map((b) => b.text ?? '')
    .join('\n\n');
}

interface DocumentIntelligencePageProps {
  documentId: string;
}

export function DocumentIntelligencePage({ documentId }: DocumentIntelligencePageProps) {
  const router = useRouter();
  const { session } = useAuth();
  const t = useTranslations('documentIntelligence');
  const formatApiError = useFormatApiError();
  const token = session?.accessToken ?? null;

  const [doc, setDoc] = useState<DocumentRecord | null>(null);
  const [download, setDownload] = useState<DocumentDownloadUrlResponse | null>(null);
  const [results, setResults] = useState<{
    analysis: {
      ocr?: unknown;
      entities?: unknown;
      events?: unknown;
      relationships?: unknown;
      summary?: unknown;
    } | null;
    updatedAt?: string | null;
  } | null>(null);
  const [tab, setTab] = useState<TabId>('text');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [ocrJob, setOcrJob] = useState<{
    status: string | null;
    error?: string | null;
  } | null>(null);

  const refreshResults = useCallback(async () => {
    if (!token) return;
    const r = (await apiClient.documentIntelligence.results(documentId, token)) as {
      analysis: {
        ocr?: unknown;
        entities?: unknown;
        events?: unknown;
        relationships?: unknown;
        summary?: unknown;
      } | null;
      updatedAt?: string | null;
    };
    setResults(r);
  }, [documentId, token]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!token) return;
      try {
        const [d, url] = await Promise.all([
          apiClient.documents.one(documentId, token),
          apiClient.documents.downloadUrl(documentId, token),
        ]);
        if (!cancelled) {
          setDoc(d);
          setDownload(url);
        }
        const r = await apiClient.documentIntelligence.results(documentId, token);
        if (!cancelled) setResults(r as typeof results);
      } catch (e) {
        if (!cancelled) setStatus(formatApiError(e));
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [documentId, token, formatApiError]);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    async function pollOcrJob() {
      try {
        const job = await apiClient.documentOcr.status(documentId, token);
        if (cancelled) return;
        setOcrJob({ status: job.status, error: job.error });
        if (job.status === 'COMPLETED') {
          await refreshResults();
          const docRow = await apiClient.documents.one(documentId, token);
          if (!cancelled) setDoc(docRow);
        }
        if (
          job.status === 'COMPLETED' ||
          job.status === 'FAILED' ||
          job.status === 'SKIPPED' ||
          job.status === null
        ) {
          if (timer) clearInterval(timer);
        }
      } catch {
        // Status endpoint is optional when pipeline is disabled.
      }
    }

    void pollOcrJob();
    timer = setInterval(() => {
      void pollOcrJob();
    }, 4000);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [documentId, token, refreshResults]);

  const analysis = results?.analysis;
  const ocr = analysis?.ocr;
  const fallbackText = extractPlainTextFromOcr(ocr) || doc?.ocrText || '';

  async function runStep(
    fn: () => Promise<unknown>,
    errLabel: string,
  ) {
    if (!token) {
      setStatus(t('needLogin'));
      return;
    }
    setBusy(true);
    setStatus('');
    try {
      await fn();
      await refreshResults();
    } catch (e) {
      setStatus(`${errLabel}: ${formatApiError(e)}`);
    } finally {
      setBusy(false);
    }
  }

  const summaryObj =
    analysis?.summary && typeof analysis.summary === 'object'
      ? (analysis.summary as Record<string, unknown>)
      : null;
  const summaryText = (summaryObj?.summary as string) ?? '';
  const uncertainty = typeof summaryObj?.uncertaintyScore === 'number' ? summaryObj.uncertaintyScore : null;

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('pageTitle')}
        description={doc ? `${doc.title} · ${doc.documentType}` : t('loadingMeta')}
        action={
          <Button variant="secondary" type="button" onClick={() => router.push('/documents')}>
            {t('backToDocuments')}
          </Button>
        }
      />

      {status ? <p className="text-sm text-rose-600 dark:text-rose-400">{status}</p> : null}

      {ocrJob?.status ? (
        <p
          className={
            ocrJob.status === 'FAILED' || ocrJob.status === 'SKIPPED'
              ? 'text-sm text-amber-700 dark:text-amber-300'
              : 'text-sm text-stone-600 dark:text-slate-400'
          }
        >
          {ocrJob.status === 'SKIPPED' && ocrJob.error
            ? t('ocrPipelineSkipped', { error: ocrJob.error })
            : t('ocrPipelineStatus', { status: ocrJob.status })}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          disabled={busy || !token}
          onClick={() => void runStep(() => apiClient.documentIntelligence.ocr({ documentId }, token), t('ocrFailed'))}
        >
          {t('runOcr')}
        </Button>
        <Button
          variant="secondary"
          disabled={busy || !token}
          onClick={() =>
            void runStep(() => apiClient.documentIntelligence.entities({ documentId }, token), t('entitiesFailed'))
          }
        >
          {t('runEntities')}
        </Button>
        <Button
          variant="secondary"
          disabled={busy || !token}
          onClick={() =>
            void runStep(() => apiClient.documentIntelligence.events({ documentId }, token), t('eventsFailed'))
          }
        >
          {t('runEvents')}
        </Button>
        <Button
          variant="secondary"
          disabled={busy || !token}
          onClick={() =>
            void runStep(
              () => apiClient.documentIntelligence.relationships({ documentId }, token),
              t('relationshipsFailed'),
            )
          }
        >
          {t('runRelationships')}
        </Button>
        <Button
          variant="secondary"
          disabled={busy || !token}
          onClick={() =>
            void runStep(() => apiClient.documentIntelligence.summary({ documentId }, token), t('summaryFailed'))
          }
        >
          {t('runSummary')}
        </Button>
        <Button
          variant="primary"
          disabled={busy || !token}
          onClick={() =>
            void runStep(async () => {
              await apiClient.documentIntelligence.ocr({ documentId }, token);
              await apiClient.documentIntelligence.entities({ documentId }, token);
              await apiClient.documentIntelligence.events({ documentId }, token);
              await apiClient.documentIntelligence.relationships({ documentId }, token);
              await apiClient.documentIntelligence.summary({ documentId }, token);
            }, t('pipelineFailed'))
          }
        >
          {t('runFullPipeline')}
        </Button>
      </div>

      {(summaryText || uncertainty != null) && (
        <Card>
          <h2 className="text-lg font-semibold text-stone-800 dark:text-slate-100">{t('aiSummary')}</h2>
          {uncertainty != null ? (
            <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">
              {t('uncertainty')}: {(uncertainty * 100).toFixed(0)}%
            </p>
          ) : null}
          <p className="mt-3 text-sm leading-relaxed text-stone-700 dark:text-slate-200">{summaryText || '—'}</p>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-stone-800 dark:text-slate-100">{t('document')}</h2>
          <DocumentViewer
            downloadUrl={download?.downloadUrl ?? null}
            mimeType={download?.mimeType ?? doc?.mimeType ?? 'application/octet-stream'}
            title={download?.title ?? doc?.title ?? 'Document'}
            loading={!download && !!token}
            loadingLabel={t('loadingDoc')}
          />
        </Card>

        <Card>
          <div className="flex gap-2 overflow-x-auto border-b border-stone-200 pb-3 [-ms-overflow-style:none] [scrollbar-width:none] dark:border-slate-800 [&::-webkit-scrollbar]:hidden">
            {(
              [
                ['text', t('tabText')],
                ['events', t('tabEvents')],
                ['relationships', t('tabRelationships')],
                ['citations', t('tabCitations')],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${
                  tab === id
                    ? 'bg-family-primary text-white dark:bg-family-accent dark:text-slate-950'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {tab === 'text' ? (
              <div className="space-y-4">
                <OcrTextPanel ocr={ocr} />
                <EntityHighlighter entitiesPayload={analysis?.entities} fallbackText={fallbackText} />
              </div>
            ) : null}
            {tab === 'events' ? (
              <SuggestedEventsPanel
                documentId={documentId}
                eventsPayload={analysis?.events}
                token={token}
                onConfirmed={() => void refreshResults()}
              />
            ) : null}
            {tab === 'relationships' ? (
              <SuggestedRelationshipsPanel
                documentId={documentId}
                relationshipsPayload={analysis?.relationships}
                token={token}
                onConfirmed={() => void refreshResults()}
              />
            ) : null}
            {tab === 'citations' ? (
              <CitationCreator
                documentId={documentId}
                defaultSourceId={doc?.sourceId}
                defaultPersonId={doc?.personId}
                token={token}
                onCreated={() => void refreshResults()}
              />
            ) : null}
          </div>
        </Card>
      </div>

      {results?.updatedAt ? (
        <p className="text-xs text-stone-400 dark:text-slate-500">
          {t('lastUpdated')}: {results.updatedAt}
        </p>
      ) : null}
    </div>
  );
}
