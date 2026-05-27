'use client';

import { FormEvent, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, FormField, Input, Select, Textarea } from '@/components/ui';
import { apiClient } from '@/lib/api-client';
import { useFormatApiError } from '@/lib/use-format-api-error';

const EVENT_TYPES = [
  'BIRTH',
  'DEATH',
  'MARRIAGE',
  'DIVORCE',
  'BURIAL',
  'RESIDENCE',
  'MIGRATION',
  'EDUCATION',
  'MILITARY',
  'WORK',
  'OCCUPATION',
  'IMMIGRATION',
  'CUSTOM',
] as const;

interface SuggestedEventsPanelProps {
  documentId: string;
  eventsPayload: unknown;
  token: string | null;
  onConfirmed?: () => void;
}

export function SuggestedEventsPanel({ documentId, eventsPayload, token, onConfirmed }: SuggestedEventsPanelProps) {
  const t = useTranslations('documentIntelligence');
  const formatApiError = useFormatApiError();
  const suggestions =
    eventsPayload &&
    typeof eventsPayload === 'object' &&
    'suggestions' in eventsPayload &&
    Array.isArray((eventsPayload as { suggestions: unknown[] }).suggestions)
      ? (eventsPayload as { suggestions: Array<Record<string, unknown>> }).suggestions
      : [];

  const [type, setType] = useState<string>('BIRTH');
  const [date, setDate] = useState('');
  const [personId, setPersonId] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  async function rejectSuggestion(suggestionId: string) {
    try {
      await apiClient.documentIntelligence.reject(documentId, { suggestionId, kind: 'event' }, token);
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
      await apiClient.documentIntelligence.confirmEvent(
        documentId,
        {
          type,
          date: date || undefined,
          personId: personId || undefined,
          description: description || undefined,
        },
        token,
      );
      setStatus(t('eventCreated'));
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
        <h3 className="text-sm font-semibold text-stone-700 dark:text-slate-200">{t('suggestedEvents')}</h3>
        {suggestions.length === 0 ? (
          <p className="mt-2 text-sm text-stone-500 dark:text-slate-400">{t('noEventSuggestions')}</p>
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
        <h3 className="text-sm font-semibold text-stone-700 dark:text-slate-200">{t('manualEventConfirm')}</h3>
        <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">{t('manualEventHint')}</p>
        <form className="mt-4 space-y-3" onSubmit={confirmManual}>
          <FormField label={t('eventType')}>
            <Select value={type} onChange={(ev) => setType(ev.target.value)}>
              {EVENT_TYPES.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label={t('eventDate')}>
            <Input value={date} onChange={(ev) => setDate(ev.target.value)} type="date" />
          </FormField>
          <FormField label={t('personId')}>
            <Input value={personId} onChange={(ev) => setPersonId(ev.target.value)} />
          </FormField>
          <FormField label={t('description')}>
            <Textarea value={description} onChange={(ev) => setDescription(ev.target.value)} />
          </FormField>
          <Button type="submit" disabled={busy || !token}>
            {t('confirmCreateEvent')}
          </Button>
        </form>
        {status ? <p className="mt-2 text-sm text-stone-600 dark:text-slate-300">{status}</p> : null}
      </div>
    </div>
  );
}
