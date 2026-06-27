'use client';

import { useEffect, useState } from 'react';
import { Activity, HardDrive, Image, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { AdminStatsResponse } from '@family/shared';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/components/auth-provider';
import { Button, Card } from '@/components/ui';
import { apiClient, formatApiError } from '@/lib/api-client';
import { ADMIN_MODERATION_LINKS, ADMIN_NAV_ITEMS } from './admin-nav';

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function AdminHubPage() {
  const { session } = useAuth();
  const t = useTranslations('adminPanel');
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session?.accessToken) return;
    void apiClient.admin
      .stats(session.accessToken)
      .then(setStats)
      .catch((err) => setError(formatApiError(err)));
  }, [session?.accessToken]);

  const quickLinks = ADMIN_NAV_ITEMS.filter((item) => item.key !== 'overview');

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-family-primary" aria-hidden />
            <div>
              <p className="text-xs uppercase tracking-wide text-stone-500">{t('stats.persons')}</p>
              <p className="text-2xl font-semibold">{stats?.personsCount ?? '—'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Image className="h-5 w-5 text-family-primary" aria-hidden />
            <div>
              <p className="text-xs uppercase tracking-wide text-stone-500">{t('stats.media')}</p>
              <p className="text-2xl font-semibold">{stats?.mediaCount ?? '—'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <HardDrive className="h-5 w-5 text-family-primary" aria-hidden />
            <div>
              <p className="text-xs uppercase tracking-wide text-stone-500">{t('stats.storage')}</p>
              <p className="text-2xl font-semibold">{stats ? formatBytes(stats.mediaBytes) : '—'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-family-primary" aria-hidden />
            <div>
              <p className="text-xs uppercase tracking-wide text-stone-500">{t('stats.lastAudit')}</p>
              <p className="text-sm font-medium">
                {stats?.lastAudit
                  ? `${stats.lastAudit.action} · ${new Date(stats.lastAudit.createdAt).toLocaleString('ru-RU')}`
                  : '—'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="font-serif text-xl font-semibold">{t('quickLinksTitle')}</h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">{t('quickLinksHint')}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-start gap-3 rounded-2xl border border-stone-200/80 p-4 transition hover:border-family-primary/40 hover:bg-stone-50/80 dark:border-slate-700 dark:hover:bg-slate-900/60"
              >
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-family-primary" aria-hidden />
                <div>
                  <p className="font-medium">{t(`nav.${item.key}`)}</p>
                  <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">{t(`sections.${item.key}Desc`)}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-serif text-xl font-semibold">{t('moderationPreviewTitle')}</h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">{t('moderationPreviewHint')}</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {ADMIN_MODERATION_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-2xl border border-stone-200/80 p-4 transition hover:border-family-primary/40 dark:border-slate-700"
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-family-primary" aria-hidden />
                  <p className="font-medium">{t(link.titleKey)}</p>
                </div>
                <p className="mt-2 text-sm text-stone-500 dark:text-slate-400">{t(link.descriptionKey)}</p>
              </Link>
            );
          })}
        </div>
        <Link href="/admin/moderation" className="mt-4 inline-block">
          <Button variant="secondary">{t('openModerationHub')}</Button>
        </Link>
      </Card>
    </div>
  );
}
