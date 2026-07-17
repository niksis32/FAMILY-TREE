'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button, Card } from '@/components/ui';
import { ADMIN_MODERATION_LINKS } from './admin-nav';
import { AdminModerationPendingBadge } from './admin-moderation-pending-badge';
import { useAdminModerationQueues } from './use-admin-moderation-queues';

export function AdminModerationPage() {
  const t = useTranslations('adminPanel');
  const { militaryPending } = useAdminModerationQueues();

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="font-serif text-xl font-semibold">{t('moderationHubTitle')}</h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">{t('moderationHubHint')}</p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {ADMIN_MODERATION_LINKS.map((link) => {
          const Icon = link.icon;
          const pendingCount = link.queueKey === 'military' ? militaryPending : 0;
          return (
            <Card
              key={link.href}
              className={pendingCount > 0 ? 'flex flex-col border-amber-300/70 p-5 ring-1 ring-amber-300/40' : 'flex flex-col p-5'}
            >
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-family-primary" aria-hidden />
                <h3 className="font-semibold">{t(link.titleKey)}</h3>
                {pendingCount > 0 ? <AdminModerationPendingBadge /> : null}
              </div>
              <p className="mt-2 flex-1 text-sm leading-6 text-stone-600 dark:text-slate-300">
                {t(link.descriptionKey)}
              </p>
              {pendingCount > 0 ? (
                <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
                  {t('moderationPendingCount', { count: pendingCount })}
                </p>
              ) : null}
              <Link href={link.href} className="mt-4">
                <Button>{t('openQueue')}</Button>
              </Link>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
