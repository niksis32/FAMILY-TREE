'use client';

import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui';
import { ComparePersonsView } from '@/features/matching/compare-persons-view';
import { MergeSuggestionPanel } from '@/features/matching/merge-suggestion-panel';
import { apiClient, formatApiError } from '@/lib/api-client';
import type { TreeMatchCandidateDto } from '@family/shared';

export default function CompareMatchPage() {
  const t = useTranslations('matching');
  const params = useParams<{ candidateId: string }>();
  const { session } = useAuth();
  const token = session?.accessToken;
  const [candidate, setCandidate] = useState<
    (TreeMatchCandidateDto & { mergeSuggestion?: { message?: string } }) | null
  >(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !params.candidateId) return;
    try {
      const data = await apiClient.matching.candidate(params.candidateId, token);
      setCandidate(data);
    } catch (e) {
      setError(formatApiError(e));
    }
  }, [token, params.candidateId]);

  useEffect(() => {
    void load();
  }, [load]);

  const accept = async () => {
    if (!token || !candidate) return;
    setBusy(true);
    try {
      const data = await apiClient.matching.accept(candidate.id, token);
      setCandidate({
        ...data,
        mergeSuggestion:
          data.mergeSuggestion && typeof data.mergeSuggestion === 'object'
            ? (data.mergeSuggestion as { message?: string })
            : undefined,
      });
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (!token || !candidate) return;
    setBusy(true);
    try {
      await apiClient.matching.reject(candidate.id, token);
      await load();
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  if (!candidate) {
    return <p className="text-stone-500">{error ?? t('loading')}</p>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold">{t('compare')}</h1>
      <ComparePersonsView candidate={candidate} />
      <section>
        <h2 className="mb-2 font-medium">{t('reasons')}</h2>
        <ul className="space-y-2 text-sm">
          {candidate.reasons.map((r, i) => (
            <li key={`${r.type}-${i}`} className="rounded-lg bg-stone-50 px-3 py-2 dark:bg-slate-800">
              <span className="font-medium">{r.type}</span> ({Math.round(r.weight * 100)}%) — {r.explanation}
            </li>
          ))}
        </ul>
      </section>
      <MergeSuggestionPanel
        sourcePersonId={candidate.sourcePersonId}
        targetPersonId={candidate.targetPersonId}
        message={
          candidate.mergeSuggestion && typeof candidate.mergeSuggestion === 'object'
            ? (candidate.mergeSuggestion as { message?: string }).message
            : undefined
        }
      />
      <div className="flex gap-2">
        <Button disabled={busy} onClick={accept}>
          {t('accept')}
        </Button>
        <Button variant="ghost" disabled={busy} onClick={reject}>
          {t('reject')}
        </Button>
      </div>
    </div>
  );
}
