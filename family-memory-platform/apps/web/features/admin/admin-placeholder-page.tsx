'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button, Card } from '@/components/ui';
import type { AdminNavKey } from './admin-nav';

type PlaceholderSection = 'sessions' | 'messages' | 'site';

const SECTION_KEYS: Record<PlaceholderSection, AdminNavKey> = {
  sessions: 'sessions',
  messages: 'messages',
  site: 'site',
};

export function AdminPlaceholderPage({ section }: { section: PlaceholderSection }) {
  const t = useTranslations('adminPanel');
  const key = SECTION_KEYS[section];

  return (
    <Card className="max-w-2xl space-y-4 p-6">
      <div>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold uppercase text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          {t('soonBadge')}
        </span>
        <h2 className="font-serif mt-3 text-2xl font-semibold">{t(`nav.${key}`)}</h2>
        <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-slate-300">{t(`placeholders.${key}Body`)}</p>
      </div>
      <ul className="list-disc space-y-1 pl-5 text-sm text-stone-600 dark:text-slate-300">
        {(t.raw(`placeholders.${key}Bullets`) as string[]).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      {section === 'site' ? (
        <Link href="/settings/branding">
          <Button variant="secondary">{t('placeholders.siteBrandingLink')}</Button>
        </Link>
      ) : null}
    </Card>
  );
}
