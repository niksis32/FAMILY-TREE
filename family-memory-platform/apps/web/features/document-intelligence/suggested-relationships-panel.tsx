'use client';

import { FormEvent, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, FormField, Input, Select, Textarea } from '@/components/ui';
import { apiClient } from '@/lib/api-client';
import { useFormatApiError } from '@/lib/use-format-api-error';

const REL_TYPES = [
  'PARENT',
  'CHILD',
  'SPOUSE',
  'SIBLING',
  'PARTNER',
  'ADOPTIVE_PARENT',
  'ADOPTIVE_CHILD',
  'UNKNOWN',
] as const;

interface SuggestedRelationshipsPanelProps {
  documentId: string;
  relationshipsPayload: unknown;
  token: string | null;
  onConfirmed?: () => void;
}

export function SuggestedRelationshipsPanel({
  documentId,
  relationshipsPayload,
  token,
  onConfirmed,
}: SuggestedRelationshipsPanelProps) {
  const t = useTranslations('documentIntelligence');
  const formatApiError = useFormatApiError();
  const suggestions =
    relationshipsPayload &&
    typeof relationshipsPayload === 'object' &&
    'suggestions' in relationshipsPayload &&
    Array.isArray((relationshipsPayload as { suggestions: unknown[] }).suggestions)
      ? (relationshipsPayload as { suggestions: Array<Record<string, unknown>> }).suggestions
      : [];

  const [fromPersonId, setFromPersonId] = useState('');
  const [toPersonId, setToPersonId] = useState('');
  const [type, setType] = useState<string>('PARENT');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  async function rejectSuggestion(suggestionId: string) {
    try {
      await apiClient.documentIntelligence.reject(documentId, { suggestionId, kind: 'relationship' }, token);
      onConfirmed?.();
    } catch (e) {
      setStatus(formatApiError(e));
    }
  }

  async function confirmManual(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus('');
    try {
      await apiClient.documentIntelligence.confirmRelationship(
        documentId,
        {
          fromPersonId,
          toPersonId,
          type,
          notes: notes || undefined,
        },
        token,
      );
      setStatus(t('relationshipCreated'));
      onConfirmed?.();
    } catch (err) {
      setStatus(formatApiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-stone-700 dark:text-slate-200">{t('suggestedRelationships')}</h3>
        {suggestions.length === 0 ? (
          <p className="mt-2 text-sm text-stone-500 dark:text-slate-400">{t('noRelationshipSuggestions')}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {suggestions.map((s, i) => {
              const sid = (s.suggestionId ?? s.id ?? String(i)) as string;
              return (
                <li
                  key={sid}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-stone-50 p-3 text-sm dark:bg-slate-950"
                >
                  <pre className="max-w-full overflow-x-auto text-xs">{JSON.stringify(s, null, 2)}</pre>
                  <Button type="button" variant="ghost" onClick={() => void rejectSuggestion(sid)}>
                    {t('reject')}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-dashed border-stone-300 p-4 dark:border-slate-600">
        <h3 className="text-sm font-semibold text-stone-700 dark:text-slate-200">{t('manualRelationshipConfirm')}</h3>
        <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">{t('manualRelationshipHint')}</p>
        <form className="mt-4 space-y-3" onSubmit={confirmManual}>
          <FormField label={t('fromPersonId')}>
            <Input value={fromPersonId} onChange={(ev) => setFromPersonId(ev.target.value)} required />
          </FormField>
          <FormField label={t('toPersonId')}>
            <Input value={toPersonId} onChange={(ev) => setToPersonId(ev.target.value)} required />
          </FormField>
          <FormField label={t('relationshipType')}>
            <Select value={type} onChange={(ev) => setType(ev.target.value)}>
              {REL_TYPES.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label={t('notes')}>
            <Textarea value={notes} onChange={(ev) => setNotes(ev.target.value)} />
          </FormField>
          <Button type="submit" disabled={busy || !token}>
            {t('confirmCreateRelationship')}
          </Button>
        </form>
        {status ? <p className="mt-2 text-sm text-stone-600 dark:text-slate-300">{status}</p> : null}
      </div>
    </div>
  );
}
