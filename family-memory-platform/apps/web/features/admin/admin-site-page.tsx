'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Save } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ModalShell } from '@family/ui';
import type {
  PortalGlobalFeatureFlagSummary,
  PortalModuleKey,
  PortalSiteSettingsResponse,
  PortalSiteStatsResponse,
  PortalWorkspaceBrandingSummary,
} from '@family/shared';
import { useAuth } from '@/components/auth-provider';
import { Badge, Button, Card, FormField, Input, Select, StatCard, Textarea } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { notifyPortalConfigChanged } from '@/components/portal-config-provider';
import { apiClient, formatApiError } from '@/lib/api-client';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 25;
const MODULE_KEYS: PortalModuleKey[] = [
  'messenger',
  'community',
  'aiLab',
  'cemeteries',
  'militaryHistory',
  'matching',
  'wiki',
  'archivesSearch',
  'calendar',
  'stories',
  'quests',
];

type Tab = 'settings' | 'modules' | 'workspaces' | 'flags';

export function AdminSitePage() {
  const { session } = useAuth();
  const t = useTranslations('adminPanel.site');
  const [tab, setTab] = useState<Tab>('settings');
  const [stats, setStats] = useState<PortalSiteStatsResponse | null>(null);
  const [settings, setSettings] = useState<PortalSiteSettingsResponse | null>(null);
  const [flags, setFlags] = useState<PortalGlobalFeatureFlagSummary[]>([]);
  const [workspaces, setWorkspaces] = useState<PortalWorkspaceBrandingSummary[]>([]);
  const [workspaceTotal, setWorkspaceTotal] = useState(0);
  const [workspaceQ, setWorkspaceQ] = useState('');
  const [workspaceQApplied, setWorkspaceQApplied] = useState('');
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editWorkspace, setEditWorkspace] = useState<PortalWorkspaceBrandingSummary | null>(null);
  const [wsForm, setWsForm] = useState({ displayName: '', primaryColor: '#1e3a5f', secondaryColor: '#c4a35a', footerText: '' });
  const [confirmSave, setConfirmSave] = useState(false);

  const load = useCallback(async () => {
    if (!session?.accessToken) return;
    setLoading(true);
    setError('');
    try {
      const [statsResult, settingsResult] = await Promise.all([
        apiClient.admin.siteStats(session.accessToken),
        apiClient.admin.siteSettings(session.accessToken),
      ]);
      setStats(statsResult);
      setSettings(settingsResult);

      if (tab === 'flags') {
        const flagResult = await apiClient.admin.listGlobalFeatureFlags(session.accessToken);
        setFlags(flagResult.items);
      }
      if (tab === 'workspaces') {
        const wsResult = await apiClient.admin.listWorkspaceBranding(session.accessToken, {
          q: workspaceQApplied || undefined,
          limit: PAGE_SIZE,
          offset,
        });
        setWorkspaces(wsResult.items);
        setWorkspaceTotal(wsResult.total);
      }
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [offset, session?.accessToken, tab, workspaceQApplied]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setOffset(0);
  }, [tab, workspaceQApplied]);

  async function saveSettings() {
    if (!session?.accessToken || !settings) return;
    setBusy(true);
    setError('');
    setStatus('');
    try {
      const updated = await apiClient.admin.updateSiteSettings(session.accessToken, {
        portalName: settings.portalName,
        tagline: settings.tagline ?? undefined,
        primaryColor: settings.primaryColor,
        secondaryColor: settings.secondaryColor,
        faviconUrl: settings.faviconUrl,
        landingCopy: settings.landingCopy,
        modules: settings.modules,
        defaultLocale: settings.defaultLocale,
        maintenanceMode: settings.maintenanceMode,
        maintenanceMessage: settings.maintenanceMessage,
      });
      setSettings(updated);
      setConfirmSave(false);
      setStatus(t('saved'));
      notifyPortalConfigChanged();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function toggleFlag(flag: PortalGlobalFeatureFlagSummary) {
    if (!session?.accessToken) return;
    setBusy(true);
    try {
      await apiClient.admin.upsertGlobalFeatureFlag(session.accessToken, {
        key: flag.key,
        enabled: !flag.enabled,
      });
      await load();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  }

  function openWorkspaceEdit(row: PortalWorkspaceBrandingSummary) {
    setEditWorkspace(row);
    setWsForm({
      displayName: row.displayName ?? row.workspaceName,
      primaryColor: row.primaryColor ?? '#1e3a5f',
      secondaryColor: row.secondaryColor ?? '#c4a35a',
      footerText: '',
    });
  }

  async function saveWorkspaceBranding() {
    if (!session?.accessToken || !editWorkspace) return;
    setBusy(true);
    try {
      await apiClient.admin.updateWorkspaceBranding(session.accessToken, editWorkspace.workspaceId, wsForm);
      setEditWorkspace(null);
      await load();
      setStatus(t('workspaceSaved'));
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  }

  function patchLanding(locale: 'ru' | 'en', field: 'heroTitle' | 'heroSubtitle' | 'ctaLabel', value: string) {
    setSettings((prev) =>
      prev
        ? {
            ...prev,
            landingCopy: {
              ...prev.landingCopy,
              [locale]: { ...prev.landingCopy[locale], [field]: value },
            },
          }
        : prev,
    );
  }

  function toggleModule(key: PortalModuleKey) {
    setSettings((prev) =>
      prev ? { ...prev, modules: { ...prev.modules, [key]: !prev.modules[key] } } : prev,
    );
  }

  const canPrev = offset > 0;
  const canNext = tab === 'workspaces' && offset + PAGE_SIZE < workspaceTotal;

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-serif text-xl font-semibold">{t('title')}</h2>
          <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">{t('hint')}</p>
        </div>
        <Link href="/settings/branding">
          <Button variant="secondary">{t('openWorkspaceBranding')}</Button>
        </Link>
      </Card>

      {stats ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label={t('stats.workspaces')} value={String(stats.workspaceCount)} hint={t('stats.workspacesHint')} />
          <StatCard label={t('stats.branded')} value={String(stats.brandedWorkspaces)} hint={t('stats.brandedHint')} />
          <StatCard label={t('stats.flags')} value={String(stats.globalFeatureFlags)} hint={t('stats.flagsHint')} />
          <StatCard
            label={t('stats.maintenance')}
            value={stats.maintenanceMode ? t('stats.maintenanceOn') : t('stats.maintenanceOff')}
            hint={t('stats.maintenanceHint')}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(['settings', 'modules', 'workspaces', 'flags'] as Tab[]).map((key) => (
          <Button key={key} variant={tab === key ? 'primary' : 'secondary'} onClick={() => setTab(key)}>
            {t(`tabs.${key}`)}
          </Button>
        ))}
        <Button variant="secondary" className="ml-auto gap-2" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} aria-hidden />
          {t('refresh')}
        </Button>
      </div>

      {status ? <p className="text-sm text-emerald-700 dark:text-emerald-300">{status}</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {tab === 'settings' && settings ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="space-y-4 p-5">
            <h3 className="font-semibold">{t('portalBranding')}</h3>
            <FormField label={t('portalName')}>
              <Input value={settings.portalName} onChange={(e) => setSettings({ ...settings, portalName: e.target.value })} />
            </FormField>
            <FormField label={t('tagline')}>
              <Input value={settings.tagline ?? ''} onChange={(e) => setSettings({ ...settings, tagline: e.target.value })} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label={t('primaryColor')}>
                <Input type="color" value={settings.primaryColor} onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })} />
              </FormField>
              <FormField label={t('secondaryColor')}>
                <Input type="color" value={settings.secondaryColor} onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })} />
              </FormField>
            </div>
            <FormField label={t('defaultLocale')}>
              <Select value={settings.defaultLocale} onChange={(e) => setSettings({ ...settings, defaultLocale: e.target.value })}>
                <option value="ru">Русский</option>
                <option value="en">English</option>
              </Select>
            </FormField>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
              />
              {t('maintenanceMode')}
            </label>
            {settings.maintenanceMode ? (
              <FormField label={t('maintenanceMessage')}>
                <Textarea
                  value={settings.maintenanceMessage ?? ''}
                  onChange={(e) => setSettings({ ...settings, maintenanceMessage: e.target.value })}
                />
              </FormField>
            ) : null}
          </Card>

          <Card className="space-y-4 p-5">
            <h3 className="font-semibold">{t('landingCopy')}</h3>
            {(['ru', 'en'] as const).map((locale) => (
              <div key={locale} className="space-y-3 rounded-2xl border p-4 dark:border-slate-800">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{locale}</p>
                <FormField label={t('heroTitle')}>
                  <Input
                    value={settings.landingCopy[locale]?.heroTitle ?? ''}
                    onChange={(e) => patchLanding(locale, 'heroTitle', e.target.value)}
                  />
                </FormField>
                <FormField label={t('heroSubtitle')}>
                  <Textarea
                    value={settings.landingCopy[locale]?.heroSubtitle ?? ''}
                    onChange={(e) => patchLanding(locale, 'heroSubtitle', e.target.value)}
                  />
                </FormField>
                <FormField label={t('ctaLabel')}>
                  <Input
                    value={settings.landingCopy[locale]?.ctaLabel ?? ''}
                    onChange={(e) => patchLanding(locale, 'ctaLabel', e.target.value)}
                  />
                </FormField>
              </div>
            ))}
            <div
              className="rounded-2xl border p-4 dark:border-slate-800"
              style={{ background: `linear-gradient(135deg, ${settings.primaryColor}22, ${settings.secondaryColor}22)` }}
            >
              <p className="text-xs uppercase tracking-wide text-stone-500">{t('preview')}</p>
              <p className="font-serif mt-2 text-2xl font-semibold">{settings.landingCopy.ru?.heroTitle}</p>
              <p className="mt-2 text-sm text-stone-600 dark:text-slate-300">{settings.landingCopy.ru?.heroSubtitle}</p>
              <Button className="mt-4" style={{ backgroundColor: settings.primaryColor }}>
                {settings.landingCopy.ru?.ctaLabel}
              </Button>
            </div>
          </Card>

          <div className="lg:col-span-2">
            <Button className="gap-2" onClick={() => setConfirmSave(true)}>
              <Save className="h-4 w-4" aria-hidden />
              {t('save')}
            </Button>
          </div>
        </div>
      ) : null}

      {tab === 'modules' && settings ? (
        <Card className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <p className="text-sm text-stone-500 dark:text-slate-400 sm:col-span-2 lg:col-span-3">{t('modulesHint')}</p>
          {MODULE_KEYS.map((key) => (
            <label key={key} className="flex items-center justify-between rounded-xl border px-4 py-3 dark:border-slate-800">
              <span className="text-sm font-medium">{t(`modules.${key}`)}</span>
              <input type="checkbox" checked={settings.modules[key]} onChange={() => toggleModule(key)} />
            </label>
          ))}
          <div className="sm:col-span-2 lg:col-span-3">
            <Button onClick={() => setConfirmSave(true)}>{t('save')}</Button>
          </div>
        </Card>
      ) : null}

      {tab === 'workspaces' ? (
        <>
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setWorkspaceQApplied(workspaceQ.trim());
            }}
          >
            <FormField label={t('searchWorkspace')} className="min-w-[14rem] flex-1">
              <Input value={workspaceQ} onChange={(e) => setWorkspaceQ(e.target.value)} placeholder={t('searchWorkspacePlaceholder')} />
            </FormField>
            <Button type="submit" className="mt-6 self-end">
              {t('searchAction')}
            </Button>
          </form>
          <Card className="overflow-hidden p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-stone-50/80 text-xs uppercase tracking-wide text-stone-500 dark:bg-slate-900/60">
                <tr>
                  <th className="px-4 py-3">{t('workspaceTable.name')}</th>
                  <th className="px-4 py-3">{t('workspaceTable.displayName')}</th>
                  <th className="px-4 py-3">{t('workspaceTable.domain')}</th>
                  <th className="px-4 py-3">{t('workspaceTable.logo')}</th>
                  <th className="px-4 py-3 text-right">{t('workspaceTable.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {workspaces.map((row) => (
                  <tr key={row.workspaceId} className="border-b border-stone-100 dark:border-slate-800">
                    <td className="px-4 py-3 font-medium">{row.workspaceName}</td>
                    <td className="px-4 py-3">{row.displayName ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{row.customDomain ?? '—'}</td>
                    <td className="px-4 py-3">{row.hasLogo ? <Badge tone="green">{t('yes')}</Badge> : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="secondary" className="h-8 px-2.5" onClick={() => openWorkspaceEdit(row)}>
                        {t('edit')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <div className="flex justify-between">
            <Button variant="secondary" disabled={!canPrev} onClick={() => setOffset((v) => Math.max(0, v - PAGE_SIZE))}>
              {t('prevPage')}
            </Button>
            <Button variant="secondary" disabled={!canNext} onClick={() => setOffset((v) => v + PAGE_SIZE)}>
              {t('nextPage')}
            </Button>
          </div>
        </>
      ) : null}

      {tab === 'flags' ? (
        <Card className="grid gap-3 p-5 sm:grid-cols-2">
          {flags.map((flag) => (
            <div key={flag.key} className="flex items-center justify-between rounded-xl border px-4 py-3 dark:border-slate-800">
              <div>
                <p className="font-mono text-sm">{flag.key}</p>
                <p className="text-xs text-stone-500">{t(`flags.${flag.key}`, { defaultValue: flag.key })}</p>
              </div>
              <Button variant={flag.enabled ? 'primary' : 'secondary'} disabled={busy} onClick={() => void toggleFlag(flag)}>
                {flag.enabled ? t('enabled') : t('disabled')}
              </Button>
            </div>
          ))}
        </Card>
      ) : null}

      <ModalShell
        open={confirmSave}
        onClose={() => {
          if (!busy) setConfirmSave(false);
        }}
        title={t('saveConfirm.title')}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmSave(false)} disabled={busy}>
              {t('no')}
            </Button>
            <Button disabled={busy} onClick={() => void saveSettings()}>
              {busy ? t('loading') : t('yes')}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-stone-600 dark:text-slate-300">{t('saveConfirm.body')}</p>
      </ModalShell>

      <ModalShell
        open={editWorkspace !== null}
        onClose={() => {
          if (!busy) setEditWorkspace(null);
        }}
        title={t('editWorkspaceTitle')}
        subtitle={editWorkspace?.workspaceName}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditWorkspace(null)} disabled={busy}>
              {t('cancel')}
            </Button>
            <Button disabled={busy} onClick={() => void saveWorkspaceBranding()}>
              {busy ? t('loading') : t('save')}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <FormField label={t('displayName')}>
            <Input value={wsForm.displayName} onChange={(e) => setWsForm((v) => ({ ...v, displayName: e.target.value }))} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t('primaryColor')}>
              <Input type="color" value={wsForm.primaryColor} onChange={(e) => setWsForm((v) => ({ ...v, primaryColor: e.target.value }))} />
            </FormField>
            <FormField label={t('secondaryColor')}>
              <Input type="color" value={wsForm.secondaryColor} onChange={(e) => setWsForm((v) => ({ ...v, secondaryColor: e.target.value }))} />
            </FormField>
          </div>
          <FormField label={t('footerText')}>
            <Textarea value={wsForm.footerText} onChange={(e) => setWsForm((v) => ({ ...v, footerText: e.target.value }))} />
          </FormField>
        </div>
      </ModalShell>
    </div>
  );
}
