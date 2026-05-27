'use client';

import { FormEvent, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, FormField, Input, Textarea } from '@/components/ui';
import { apiClient } from '@/lib/api-client';
import { useFormatApiError } from '@/lib/use-format-api-error';

interface CitationCreatorProps {
  documentId: string;
  defaultSourceId?: string | null;
  defaultPersonId?: string | null;
  token: string | null;
  onCreated?: () => void;
}

export function CitationCreator({
  documentId,
  defaultSourceId,
  defaultPersonId,
  token,
  onCreated,
}: CitationCreatorProps) {
  const t = useTranslations('documentIntelligence');
  const formatApiError = useFormatApiError();
  const [sourceId, setSourceId] = useState(defaultSourceId ?? '');
  const [personId, setPersonId] = useState(defaultPersonId ?? '');
  const [page, setPage] = useState('');
  const [detail, setDetail] = useState('');
  const [fragment, setFragment] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus('');
    try {
      const mergedDetail = [detail.trim(), fragment.trim() ? `«${fragment.trim()}»` : ''].filter(Boolean).join('\n');
      await apiClient.documentIntelligence.confirmCitation(
        documentId,
        {
          sourceId,
          personId: personId || undefined,
          page: page || undefined,
          detail: mergedDetail || undefined,
        },
        token,
      );
      setStatus(t('citationCreated'));
      setFragment('');
      onCreated?.();
    } catch (err) {
      setStatus(formatApiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-dashed border-stone-300 p-4 dark:border-slate-600">
      <h3 className="text-sm font-semibold text-stone-700 dark:text-slate-200">{t('citationFromDocument')}</h3>
      <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">{t('citationHint')}</p>
      <form className="mt-4 space-y-3" onSubmit={submit}>
        <FormField label={t('sourceId')}>
          <Input value={sourceId} onChange={(ev) => setSourceId(ev.target.value)} required />
        </FormField>
        <FormField label={t('personIdOptional')}>
          <Input value={personId} onChange={(ev) => setPersonId(ev.target.value)} />
        </FormField>
        <FormField label={t('page')}>
          <Input value={page} onChange={(ev) => setPage(ev.target.value)} />
        </FormField>
        <FormField label={t('selectedFragment')}>
          <Textarea value={fragment} onChange={(ev) => setFragment(ev.target.value)} placeholder={t('fragmentPh')} />
        </FormField>
        <FormField label={t('detail')}>
          <Textarea value={detail} onChange={(ev) => setDetail(ev.target.value)} />
        </FormField>
        <Button type="submit" disabled={busy || !token}>
          {t('confirmCreateCitation')}
        </Button>
      </form>
      {status ? <p className="mt-2 text-sm text-stone-600 dark:text-slate-300">{status}</p> : null}
    </div>
  );
}
