'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { PageHeader, Card, Button, Input } from '@/components/ui';
import { apiClient, formatApiError } from '@/lib/api-client';
import { useWorkspaceCommercial } from '@/features/commercial/use-workspace-commercial';

type BrandingState = {
  displayName?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  customDomain?: string | null;
  domainVerified?: boolean;
  footerText?: string | null;
};

export function SettingsBrandingPage() {
  const t = useTranslations('block5.branding');
  const { token, overview, loading, error: workspaceError } = useWorkspaceCommercial();
  const [branding, setBranding] = useState<BrandingState>({});
  const [customDomain, setCustomDomain] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [dnsHint, setDnsHint] = useState<{ dnsTxtRecord?: string; txtValue?: string } | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const whiteLabel = overview?.enabledFeatures?.includes('whiteLabel') ?? false;

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const data = (await apiClient.branding.get(token)) as BrandingState;
      setBranding(data);
      setCustomDomain(data.customDomain ?? '');
      setLogoUrl((data as { logoUrl?: string }).logoUrl ?? null);
    } catch (e) {
      setStatus(formatApiError(e));
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveBranding() {
    if (!token) return;
    setStatus(null);
    try {
      const updated = await apiClient.branding.update(
        {
          displayName: branding.displayName,
          primaryColor: branding.primaryColor,
          secondaryColor: branding.secondaryColor,
          footerText: branding.footerText,
        },
        token,
      );
      setBranding(updated as BrandingState);
      setStatus(t('saved'));
    } catch (e) {
      setStatus(formatApiError(e));
    }
  }

  async function configureDomain() {
    if (!token || !customDomain.trim()) return;
    setStatus(null);
    try {
      const result = (await apiClient.branding.setCustomDomain(customDomain.trim(), token)) as BrandingState & {
        verificationInstructions?: { dnsTxtRecord: string; txtValue: string };
      };
      setBranding(result);
      setDnsHint(result.verificationInstructions ?? null);
      setStatus(t('domainConfigured'));
    } catch (e) {
      setStatus(formatApiError(e));
    }
  }

  async function verifyDomain() {
    if (!token) return;
    try {
      const result = (await apiClient.branding.verifyDomain(token)) as BrandingState;
      setBranding(result);
      setStatus(t('domainVerified'));
    } catch (e) {
      setStatus(formatApiError(e));
    }
  }

  async function provisionSsl() {
    if (!token) return;
    try {
      const result = await apiClient.branding.provisionSsl(token);
      setStatus(`${t('sslQueued')}: ${(result as { domain?: string }).domain ?? ''}`);
    } catch (e) {
      setStatus(formatApiError(e));
    }
  }

  async function uploadLogo() {
    if (!token || !logoFile) return;
    setStatus(null);
    try {
      const presign = (await apiClient.branding.logoUploadUrl(
        { fileName: logoFile.name, contentType: logoFile.type || 'image/png' },
        token,
      )) as { uploadUrl: string };
      const put = await fetch(presign.uploadUrl, {
        method: 'PUT',
        body: logoFile,
        headers: { 'Content-Type': logoFile.type || 'image/png' },
      });
      if (!put.ok) throw new Error(`Logo upload failed: ${put.status}`);
      await load();
      setStatus(t('logoUploaded'));
    } catch (e) {
      setStatus(formatApiError(e));
    }
  }

  if (loading) return <p className="text-sm text-stone-500">{t('loading')}</p>;
  if (workspaceError) return <p className="text-sm text-red-600">{workspaceError}</p>;
  if (!whiteLabel) {
    return (
      <div className="space-y-4">
        <PageHeader title={t('title')} description={t('description')} />
        <p className="text-sm text-amber-700 dark:text-amber-300">{t('upgradeRequired')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title={t('title')} description={t('description')} />

      <Card>
        <h2 className="text-lg font-semibold">{t('identity')}</h2>
        <Input
          className="mt-4"
          value={branding.displayName ?? ''}
          onChange={(e) => setBranding((b) => ({ ...b, displayName: e.target.value }))}
          placeholder={t('displayName')}
        />
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <Input
            value={branding.primaryColor ?? ''}
            onChange={(e) => setBranding((b) => ({ ...b, primaryColor: e.target.value }))}
            placeholder="#1e3a5f"
          />
          <Input
            value={branding.secondaryColor ?? ''}
            onChange={(e) => setBranding((b) => ({ ...b, secondaryColor: e.target.value }))}
            placeholder="#c4a35a"
          />
        </div>
        <Input
          className="mt-2"
          value={branding.footerText ?? ''}
          onChange={(e) => setBranding((b) => ({ ...b, footerText: e.target.value }))}
          placeholder={t('footerText')}
        />
        <Button className="mt-4" type="button" onClick={() => void saveBranding()}>
          {t('save')}
        </Button>
        <div className="mt-6 border-t pt-4 dark:border-slate-700">
          <h3 className="text-sm font-semibold">{t('logo')}</h3>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="mt-2 h-12 object-contain" />
          ) : null}
          <Input
            className="mt-2"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
          />
          <Button className="mt-2" type="button" variant="secondary" disabled={!logoFile} onClick={() => void uploadLogo()}>
            {t('uploadLogo')}
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">{t('customDomain')}</h2>
        <Input className="mt-4" value={customDomain} onChange={(e) => setCustomDomain(e.target.value)} />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => void configureDomain()}>
            {t('configureDomain')}
          </Button>
          <Button type="button" variant="secondary" onClick={() => void verifyDomain()}>
            {t('verifyDomain')}
          </Button>
          <Button type="button" onClick={() => void provisionSsl()} disabled={!branding.domainVerified}>
            {t('provisionSsl')}
          </Button>
        </div>
        {dnsHint ? (
          <pre className="mt-3 overflow-auto rounded bg-stone-100 p-3 text-xs dark:bg-slate-900">
            {dnsHint.dnsTxtRecord} = {dnsHint.txtValue}
          </pre>
        ) : null}
        {branding.domainVerified ? (
          <p className="mt-2 text-sm text-green-700 dark:text-green-400">{t('verifiedBadge')}</p>
        ) : null}
      </Card>

      {status ? <p className="text-sm text-stone-600 dark:text-stone-300">{status}</p> : null}
    </div>
  );
}
