'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { PageHeader, Card, Button, Input } from '@/components/ui';
import { apiClient, formatApiError } from '@/lib/api-client';
import { useWorkspaceCommercial } from '@/features/commercial/use-workspace-commercial';

type DnaProfile = {
  provider?: string;
  snpCount?: number;
  fileName?: string | null;
  importedAt?: string | null;
  disclaimer?: string;
};

type DnaMatch = {
  id: string;
  displayLabel: string;
  sharedSegments: number;
  totalCm: number;
  confidence: number;
};

export function SettingsDnaPage() {
  const t = useTranslations('block5.dna');
  const { token, loading, error: workspaceError } = useWorkspaceCommercial();
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<DnaProfile | null>(null);
  const [matches, setMatches] = useState<DnaMatch[]>([]);
  const [consentGranted, setConsentGranted] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!token) return;
    try {
      const data = (await apiClient.dna.profile(token)) as DnaProfile;
      setProfile(data);
      setConsentGranted(true);
      setStep(4);
      try {
        const matchData = (await apiClient.dna.matches(token)) as { matches?: DnaMatch[] };
        setMatches(matchData.matches ?? []);
      } catch {
        setMatches([]);
      }
    } catch {
      setProfile(null);
    }
  }, [token]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  async function grantConsent() {
    if (!token) return;
    try {
      await apiClient.dna.grantConsent(token);
      setConsentGranted(true);
      setStep(2);
      setStatus(t('consentGranted'));
    } catch (e) {
      setStatus(formatApiError(e));
    }
  }

  async function uploadAndImport() {
    if (!token || !file) return;
    setStatus(null);
    try {
      if (!consentGranted) {
        await apiClient.dna.grantConsent(token);
        setConsentGranted(true);
      }
      const upload = (await apiClient.dna.uploadUrl(file.name, token)) as {
        uploadUrl: string;
        storageKey: string;
      };
      const put = await fetch(upload.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': 'application/octet-stream' },
      });
      if (!put.ok) throw new Error(`Upload failed: ${put.status}`);
      await apiClient.dna.createImportJob({ fileKey: upload.storageKey, fileName: file.name }, token);
      setStatus(t('importQueued'));
      setStep(4);
      await loadProfile();
    } catch (e) {
      setStatus(formatApiError(e));
    }
  }

  async function deleteProfile() {
    if (!token) return;
    try {
      await apiClient.dna.deleteProfile(token);
      setProfile(null);
      setMatches([]);
      setStep(1);
      setStatus(t('deleted'));
    } catch (e) {
      setStatus(formatApiError(e));
    }
  }

  if (loading) return <p className="text-sm text-stone-500">{t('loading')}</p>;
  if (workspaceError) return <p className="text-sm text-red-600">{workspaceError}</p>;

  return (
    <div className="space-y-8">
      <PageHeader title={t('title')} description={t('description')} />

      <div className="flex flex-wrap gap-2 text-xs">
        {[1, 2, 3, 4].map((n) => (
          <span
            key={n}
            className={`rounded-full px-3 py-1 ${step === n ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900' : 'bg-stone-100 dark:bg-slate-800'}`}
          >
            {t(`wizardStep${n}`)}
          </span>
        ))}
      </div>

      {step === 1 ? (
        <Card>
          <p className="text-sm text-stone-600 dark:text-stone-300">{t('disclaimer')}</p>
          <Button className="mt-4" type="button" onClick={() => void grantConsent()}>
            {t('grantConsent')}
          </Button>
        </Card>
      ) : null}

      {step >= 2 && step < 4 ? (
        <Card>
          <h2 className="text-lg font-semibold">{t('import')}</h2>
          <Input
            className="mt-4"
            type="file"
            accept=".txt,.csv,.zip"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <Button className="mt-4" type="button" disabled={!file} onClick={() => void uploadAndImport()}>
            {t('uploadImport')}
          </Button>
        </Card>
      ) : null}

      {profile ? (
        <Card>
          <h2 className="text-lg font-semibold">{t('currentProfile')}</h2>
          <ul className="mt-3 space-y-1 text-sm">
            <li>{t('provider')}: {profile.provider}</li>
            <li>{t('snpCount')}: {profile.snpCount?.toLocaleString()}</li>
            <li>{t('file')}: {profile.fileName}</li>
            <li>{t('importedAt')}: {profile.importedAt ? new Date(profile.importedAt).toLocaleString() : '—'}</li>
          </ul>
          <Button className="mt-4" type="button" variant="secondary" onClick={() => void deleteProfile()}>
            {t('deleteProfile')}
          </Button>
        </Card>
      ) : null}

      {matches.length > 0 ? (
        <Card>
          <h2 className="text-lg font-semibold">{t('matches')}</h2>
          <p className="mt-1 text-xs text-stone-500">{t('matchesNote')}</p>
          <ul className="mt-4 space-y-2 text-sm">
            {matches.map((m) => (
              <li key={m.id} className="rounded border p-3 dark:border-slate-700">
                <p className="font-medium">{m.displayLabel}</p>
                <p className="text-stone-500">
                  {m.sharedSegments} segments · {m.totalCm.toFixed(1)} cM · {(m.confidence * 100).toFixed(0)}%
                </p>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {status ? <p className="text-sm text-stone-600 dark:text-stone-300">{status}</p> : null}
    </div>
  );
}
