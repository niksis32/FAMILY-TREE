'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { MergeFieldDiff, MergePreview, TreeMatchCandidateDto } from '@family/shared';
import { useAuth } from '@/components/auth-provider';
import { PersonSearchCombobox } from '@/components/person-search-combobox';
import { Button } from '@/components/ui';
import { PageHero } from '@family/ui';
import { apiClient, formatApiError } from '@/lib/api-client';

function formatFieldValue(value: unknown) {
  if (value == null || value === '') return '—';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  return String(value);
}

export function MergeWizardPage() {
  const { session } = useAuth();
  const t = useTranslations('mergeWizard');
  const [survivorId, setSurvivorId] = useState('');
  const [mergedId, setMergedId] = useState('');
  const [persons, setPersons] = useState<Array<{ id: string; givenName: string; familyName?: string | null; birthDate?: string | null }>>([]);
  const [candidates, setCandidates] = useState<TreeMatchCandidateDto[]>([]);
  const [preview, setPreview] = useState<MergePreview | null>(null);
  const [fieldResolutions, setFieldResolutions] = useState<Record<string, MergeFieldDiff['resolution']>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadMeta = useCallback(async () => {
    if (!session?.accessToken) return;
    try {
      const [personRows, inbox] = await Promise.all([
        apiClient.persons.list(session.accessToken),
        apiClient.matching.inbox(session.accessToken),
      ]);
      setPersons(
        (personRows as Array<{ id: string; givenName: string; familyName?: string | null; birthDate?: string | null }>).map(
          (p) => ({
            id: p.id,
            givenName: p.givenName,
            familyName: p.familyName,
            birthDate: p.birthDate,
          }),
        ),
      );
      setCandidates(inbox.filter((c) => c.status === 'NEW' || c.status === 'NEEDS_REVIEW'));
    } catch {
      /* optional */
    }
  }, [session?.accessToken]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  const personOptions = useMemo(
    () =>
      persons.map((p) => ({
        id: p.id,
        givenName: p.givenName,
        familyName: p.familyName ?? null,
        birthDate: p.birthDate ?? null,
      })),
    [persons],
  );

  function selectCandidate(candidate: TreeMatchCandidateDto) {
    setSurvivorId(candidate.sourcePersonId);
    setMergedId(candidate.targetPersonId);
    setPreview(null);
    setFieldResolutions({});
  }

  async function runPreview() {
    if (!session?.accessToken) return;
    setBusy(true);
    setError('');
    try {
      const data = await apiClient.duplicateMerge.preview(survivorId, mergedId, session.accessToken);
      setPreview(data);
      const defaults: Record<string, MergeFieldDiff['resolution']> = {};
      for (const diff of data.fieldDiffs) {
        defaults[diff.field] = diff.resolution;
      }
      setFieldResolutions(defaults);
    } catch (err) {
      setError(formatApiError(err));
      setPreview(null);
    } finally {
      setBusy(false);
    }
  }

  async function runMerge() {
    if (!session?.accessToken || !preview) return;
    if (!window.confirm(t('confirmMerge'))) return;
    setBusy(true);
    setError('');
    try {
      await apiClient.duplicateMerge.execute(survivorId, mergedId, session.accessToken, fieldResolutions);
      setPreview(null);
      setMergedId('');
      setFieldResolutions({});
      void loadMeta();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHero eyebrow={t('eyebrow')} title={t('title')} description={t('description')} />

      {candidates.length ? (
        <section className="rounded-xl border border-stone-200 p-4 dark:border-slate-700">
          <h3 className="font-semibold">{t('candidatePicker')}</h3>
          <ul className="mt-3 space-y-2">
            {candidates.slice(0, 10).map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className="w-full rounded-lg border border-stone-100 px-3 py-2 text-left text-sm hover:bg-stone-50 dark:border-slate-800 dark:hover:bg-slate-900"
                  onClick={() => selectCandidate(c)}
                >
                  {c.sourcePerson?.displayName ?? c.sourcePersonId} ↔ {c.targetPerson?.displayName ?? c.targetPersonId}
                  <span className="ml-2 text-stone-500">{Math.round(c.score * 100)}%</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">{t('survivorId')}</label>
          <PersonSearchCombobox persons={personOptions} value={survivorId} onChange={setSurvivorId} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('mergedId')}</label>
          <PersonSearchCombobox persons={personOptions} value={mergedId} onChange={setMergedId} />
        </div>
      </div>

      <Button onClick={() => void runPreview()} disabled={busy || !survivorId || !mergedId}>{t('preview')}</Button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {preview ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
          <h3 className="font-semibold">{t('previewTitle')}</h3>
          <p className="mt-1 text-sm">{preview.survivorName} ← {preview.mergedName}</p>
          <ul className="mt-3 text-sm">
            <li>{t('relationships')}: {preview.repointCounts.relationships}</li>
            <li>{t('events')}: {preview.repointCounts.events}</li>
            <li>{t('documents')}: {preview.repointCounts.documents}</li>
            <li>{t('citations')}: {preview.repointCounts.citations}</li>
          </ul>

          {preview.fieldDiffs.length ? (
            <div className="mt-4 overflow-x-auto">
              <h4 className="text-sm font-semibold">{t('fieldResolution')}</h4>
              <table className="mt-2 w-full text-sm">
                <thead>
                  <tr className="text-left text-stone-500">
                    <th className="py-1 pr-2">{t('field')}</th>
                    <th className="py-1 pr-2">{t('survivorValue')}</th>
                    <th className="py-1 pr-2">{t('mergedValue')}</th>
                    <th className="py-1">{t('resolution')}</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.fieldDiffs.map((diff) => (
                    <tr key={diff.field} className="border-t border-amber-100 dark:border-amber-900/50">
                      <td className="py-2 pr-2 font-medium">{diff.field}</td>
                      <td className="py-2 pr-2">{formatFieldValue(diff.survivorValue)}</td>
                      <td className="py-2 pr-2">{formatFieldValue(diff.mergedValue)}</td>
                      <td className="py-2">
                        <select
                          className="rounded border px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
                          value={fieldResolutions[diff.field] ?? diff.resolution}
                          onChange={(e) =>
                            setFieldResolutions((prev) => ({
                              ...prev,
                              [diff.field]: e.target.value as MergeFieldDiff['resolution'],
                            }))
                          }
                        >
                          <option value="survivor">{t('keepSurvivor')}</option>
                          <option value="merged">{t('keepMerged')}</option>
                          {diff.field === 'biography' ? <option value="combine">{t('combineBiography')}</option> : null}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {preview.warnings.length ? (
            <ul className="mt-2 text-sm text-amber-800 dark:text-amber-200">
              {preview.warnings.map((w) => <li key={w}>⚠ {w}</li>)}
            </ul>
          ) : null}
          <Button className="mt-4" onClick={() => void runMerge()} disabled={busy}>{t('execute')}</Button>
        </section>
      ) : null}
    </div>
  );
}
