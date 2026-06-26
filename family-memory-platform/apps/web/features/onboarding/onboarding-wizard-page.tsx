'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { ONBOARDING_STEPS, type OnboardingProgressDto, type OnboardingStepId } from '@family/shared';
import { useAuth } from '@/components/auth-provider';
import { Button, Card } from '@/components/ui';
import { PageHero } from '@family/ui';
import { apiClient, formatApiError } from '@/lib/api-client';

const STEP_ROUTES: Partial<Record<OnboardingStepId, string>> = {
  create_tree: '/tree',
  add_person: '/persons',
  upload_photo: '/media',
  invite_family: '/settings/team',
};

export function OnboardingWizardPage() {
  const t = useTranslations('onboarding');
  const router = useRouter();
  const { session } = useAuth();
  const token = session?.accessToken;
  const [progress, setProgress] = useState<OnboardingProgressDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiClient.onboarding.progress(token);
      setProgress(data);
    } catch (e) {
      setError(formatApiError(e));
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const advance = async (action: 'completeStep' | 'skipStep') => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const body = action === 'completeStep' ? { completeStep: true } : { skipStep: true };
      const data = await apiClient.onboarding.updateProgress(body, token);
      setProgress(data);
      if (data.isCompleted) router.push('/dashboard');
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  if (!progress) {
    return <p className="text-sm text-stone-500">{t('loading')}</p>;
  }

  const step = progress.currentStep;
  const stepIndex = ONBOARDING_STEPS.indexOf(step);
  const deepLink = STEP_ROUTES[step];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHero eyebrow={t('eyebrow')} title={t('title')} description={t('description')} />

      <div className="flex gap-2">
        {ONBOARDING_STEPS.map((s, idx) => (
          <div
            key={s}
            className={`h-2 flex-1 rounded-full ${idx <= stepIndex ? 'bg-family-primary' : 'bg-stone-200 dark:bg-slate-700'}`}
          />
        ))}
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold">{t(`steps.${step === 'create_tree' ? 'createTree' : step === 'add_person' ? 'addPerson' : step === 'upload_photo' ? 'uploadPhoto' : step === 'invite_family' ? 'inviteFamily' : step}`)}</h2>
        <p className="mt-2 text-sm text-stone-600 dark:text-slate-300">{t(`hints.${step === 'create_tree' ? 'createTree' : step === 'add_person' ? 'addPerson' : step === 'upload_photo' ? 'uploadPhoto' : step === 'invite_family' ? 'inviteFamily' : step}`)}</p>

        {deepLink ? (
          <Button type="button" className="mt-4" variant="secondary" onClick={() => router.push(deepLink)}>
            {t('openStep')}
          </Button>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2">
          <Button type="button" disabled={busy} onClick={() => void advance('completeStep')}>
            {step === 'complete' ? t('finish') : t('next')}
          </Button>
          {step !== 'complete' && step !== 'welcome' ? (
            <Button type="button" variant="ghost" disabled={busy} onClick={() => void advance('skipStep')}>
              {t('skip')}
            </Button>
          ) : null}
        </div>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </Card>

      <p className="text-xs text-stone-500">
        {t('resumeHint')} — {progress.completedSteps.length}/{ONBOARDING_STEPS.length}
      </p>
    </div>
  );
}
