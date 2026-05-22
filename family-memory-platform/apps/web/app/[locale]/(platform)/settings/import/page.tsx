import { getTranslations } from 'next-intl/server';
import { GedcomImportPanel } from '@/components/gedcom-import-panel';
import { PageHeader } from '@/components/ui';

export default async function SettingsImportPage() {
  const t = await getTranslations('pages.settingsImport');

  return (
    <div className="space-y-8">
      <PageHeader title={t('title')} description={t('description')} />
      <GedcomImportPanel />
    </div>
  );
}
