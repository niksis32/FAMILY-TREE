'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import type { BibliographyExport, EvidenceCitationSummary } from '@family/shared';
import { useAuth } from '@/components/auth-provider';
import { PersonSearchCombobox } from '@/components/person-search-combobox';
import { Button } from '@/components/ui';
import { PageHero } from '@family/ui';
import { apiClient, formatApiError, type EventRecord, type SourceRecord } from '@/lib/api-client';

export function EvidencePage() {
  const { session, isReady } = useAuth();
  const t = useTranslations('evidence');
  const [citations, setCitations] = useState<EvidenceCitationSummary[]>([]);
  const [sources, setSources] = useState<SourceRecord[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [persons, setPersons] = useState<Array<{ id: string; givenName: string; familyName?: string | null; birthDate?: string | null }>>([]);
  const [exportData, setExportData] = useState<BibliographyExport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ sourceId: '', personId: '', eventId: '', page: '', detail: '' });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!session?.accessToken) return;
    setLoading(true);
    setError('');
    try {
      const [rows, sourceRows, eventRows, personRows] = await Promise.all([
        apiClient.evidence.listCitations(session.accessToken),
        apiClient.sources.list(session.accessToken),
        apiClient.events.list(session.accessToken),
        apiClient.persons.list(session.accessToken),
      ]);
      setCitations(rows);
      setSources(sourceRows);
      setEvents(eventRows);
      setPersons(
        (personRows as Array<{ id: string; givenName: string; familyName?: string | null; birthDate?: string | null }>).map(
          (p) => ({ id: p.id, givenName: p.givenName, familyName: p.familyName, birthDate: p.birthDate }),
        ),
      );
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

  const filteredEvents = useMemo(() => {
    if (!form.personId) return events;
    return events.filter((e) => e.personId === form.personId);
  }, [events, form.personId]);

  async function exportBibliography(format: 'text' | 'bibtex' | 'json') {
    if (!session?.accessToken) return;
    try {
      const data = await apiClient.evidence.exportBibliography(session.accessToken, format);
      setExportData(data);
    } catch (err) {
      setError(formatApiError(err));
    }
  }

  async function createCitation(e: FormEvent) {
    e.preventDefault();
    if (!session?.accessToken || !form.sourceId) return;
    setCreating(true);
    setError('');
    try {
      await apiClient.evidence.createCitation(
        {
          sourceId: form.sourceId,
          personId: form.personId || undefined,
          eventId: form.eventId || undefined,
          page: form.page || undefined,
          detail: form.detail || undefined,
        },
        session.accessToken,
      );
      setForm({ sourceId: '', personId: '', eventId: '', page: '', detail: '' });
      void load();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setCreating(false);
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

      <form onSubmit={(e) => void createCitation(e)} className="rounded-xl border border-stone-200 p-4 dark:border-slate-700">
        <h3 className="font-semibold">{t('createCitation')}</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block">{t('source')}</span>
            <select
              className="w-full rounded-lg border px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
              value={form.sourceId}
              onChange={(ev) => setForm((f) => ({ ...f, sourceId: ev.target.value }))}
              required
            >
              <option value="">{t('selectSource')}</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block">{t('person')}</span>
            <PersonSearchCombobox
              persons={persons.map((p) => ({ ...p, familyName: p.familyName ?? null, birthDate: p.birthDate ?? null }))}
              value={form.personId}
              onChange={(personId) => setForm((f) => ({ ...f, personId, eventId: '' }))}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block">{t('linkedEvent')}</span>
            <select
              className="w-full rounded-lg border px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
              value={form.eventId}
              onChange={(ev) => setForm((f) => ({ ...f, eventId: ev.target.value }))}
            >
              <option value="">{t('selectEvent')}</option>
              {filteredEvents.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.type} {ev.date ? ev.date.slice(0, 10) : ''} — {ev.description ?? ev.id}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block">{t('page')}</span>
            <input
              className="w-full rounded-lg border px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
              value={form.page}
              onChange={(ev) => setForm((f) => ({ ...f, page: ev.target.value }))}
            />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block">{t('detail')}</span>
            <textarea
              className="min-h-[72px] w-full rounded-lg border px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
              value={form.detail}
              onChange={(ev) => setForm((f) => ({ ...f, detail: ev.target.value }))}
            />
          </label>
        </div>
        <Button type="submit" className="mt-3" disabled={creating || !form.sourceId}>{t('saveCitation')}</Button>
      </form>

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
