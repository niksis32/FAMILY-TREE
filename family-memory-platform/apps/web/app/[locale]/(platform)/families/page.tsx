import { getTranslations } from 'next-intl/server';
import { FamiliesWorkspace } from '@/components/families-workspace';
import { PageHeader } from '@/components/ui';

export default async function FamiliesPage() {
  const t = await getTranslations('pages.families');

  return (
    <div className="space-y-8">
      <PageHeader title={t('title')} description={t('description')} />
      <FamiliesWorkspace />
    </div>
  );
}
