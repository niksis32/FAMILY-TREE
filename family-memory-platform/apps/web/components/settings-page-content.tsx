'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { PrivacyBadge } from '@/components/domain';
import { Button, Card, Input, PageHeader, Select } from '@/components/ui';

export function SettingsPageContent() {
  const t = useTranslations('pages.settings');
  const tPrivacy = useTranslations('privacy');
  const tCommon = useTranslations('common');

  return (
    <div className="space-y-8">
      <PageHeader title={t('title')} description={t('description')} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-xl font-semibold">{t('profile')}</h2>
          <div className="mt-5 space-y-4">
            <Input defaultValue="Family Admin" />
            <Input defaultValue="demo@family.local" type="email" />
            <Button type="button">{tCommon('save')}</Button>
          </div>
        </Card>
        <Card>
          <h2 className="text-xl font-semibold">{t('privacy')}</h2>
          <div className="mt-5 flex flex-wrap gap-3">
            <PrivacyBadge level="public" />
            <PrivacyBadge level="family" />
            <PrivacyBadge level="private" />
          </div>
          <Select className="mt-5" defaultValue="family">
            <option value="public">{tPrivacy('public')}</option>
            <option value="family">{tPrivacy('family')}</option>
            <option value="private">{tPrivacy('private')}</option>
          </Select>
        </Card>
        <Card>
          <h2 className="text-xl font-semibold">{t('import')}</h2>
          <p className="mt-3 text-sm leading-6 text-stone-600 dark:text-slate-300">{t('importDesc')}</p>
          <Link href="/settings/import">
            <Button className="mt-5" type="button">
              {t('openGedcom')}
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}
