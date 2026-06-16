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

export function SettingsDnaPage() {
  const t = useTranslations('block5.dna');
  const { token, loading, error: workspaceError } = useWorkspaceCommercial();
  const [profile, setProfile] = useState<DnaProfile | null>(null);
  const [consentGranted, setConsentGranted] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!token) return;
    try {
      const data = (await apiClient.dna.profile(token)) as DnaProfile;
      setProfile(data);
      setConsentGranted(true);
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

      <Card>
        <p className="text-sm text-stone-600 dark:text-stone-300">{t('disclaimer')}</p>
        {!consentGranted ? (
          <Button className="mt-4" type="button" onClick={() => void grantConsent()}>
            {t('grantConsent')}
          </Button>
        ) : (
          <p className="mt-3 text-sm text-green-700 dark:text-green-400">{t('consentOk')}</p>
        )}
      </Card>

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

      {status ? <p className="text-sm text-stone-600 dark:text-stone-300">{status}</p> : null}
    </div>
  );
}
