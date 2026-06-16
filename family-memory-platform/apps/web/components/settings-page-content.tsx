'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { PrivacyBadge } from '@/components/domain';
import { Button, Card, Input, PageHeader, Select } from '@/components/ui';

export function SettingsPageContent() {
  const t = useTranslations('pages.settings');
  const tSettings = useTranslations('settingsPage');
  const tPrivacy = useTranslations('privacy');
  const tCommon = useTranslations('common');

  return (
    <div className="space-y-8">
      <PageHeader title={t('title')} description={t('description')} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-xl font-semibold">{t('profile')}</h2>
          <div className="mt-5 space-y-4">
            <Input defaultValue={tSettings('displayNamePh')} />
            <Input defaultValue={tSettings('emailPh')} type="email" />
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
        <Card>
          <h2 className="text-xl font-semibold">{t('commercial')}</h2>
          <p className="mt-3 text-sm leading-6 text-stone-600 dark:text-slate-300">{t('commercialDesc')}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/settings/billing">
              <Button type="button">{t('billing')}</Button>
            </Link>
            <Link href="/settings/team">
              <Button type="button">{t('team')}</Button>
            </Link>
            <Link href="/settings/privacy-center">
              <Button type="button">{t('privacyCenter')}</Button>
            </Link>
            <Link href="/settings/export">
              <Button type="button">{t('export')}</Button>
            </Link>
            <Link href="/settings/webhooks">
              <Button type="button">{t('webhooks')}</Button>
            </Link>
            <Link href="/settings/branding">
              <Button type="button">{t('branding')}</Button>
            </Link>
            <Link href="/settings/dna">
              <Button type="button">{t('dna')}</Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
