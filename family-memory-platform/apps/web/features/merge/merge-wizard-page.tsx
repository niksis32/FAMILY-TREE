'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { MergePreview } from '@family/shared';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui';
import { PageHero } from '@family/ui';
import { apiClient, formatApiError } from '@/lib/api-client';

export function MergeWizardPage() {
  const { session } = useAuth();
  const t = useTranslations('mergeWizard');
  const [survivorId, setSurvivorId] = useState('');
  const [mergedId, setMergedId] = useState('');
  const [preview, setPreview] = useState<MergePreview | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function runPreview() {
    if (!session?.accessToken) return;
    setBusy(true);
    setError('');
    try {
      const data = await apiClient.duplicateMerge.preview(survivorId, mergedId, session.accessToken);
      setPreview(data);
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
      await apiClient.duplicateMerge.execute(survivorId, mergedId, session.accessToken);
      setPreview(null);
      setMergedId('');
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHero eyebrow={t('eyebrow')} title={t('title')} description={t('description')} />
      <div className="grid gap-3 md:grid-cols-2">
        <input className="rounded-lg border px-3 py-2 dark:border-slate-700 dark:bg-slate-900" placeholder={t('survivorId')} value={survivorId} onChange={(e) => setSurvivorId(e.target.value)} />
        <input className="rounded-lg border px-3 py-2 dark:border-slate-700 dark:bg-slate-900" placeholder={t('mergedId')} value={mergedId} onChange={(e) => setMergedId(e.target.value)} />
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
