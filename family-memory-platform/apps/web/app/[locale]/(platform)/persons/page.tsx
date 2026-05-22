import { getTranslations } from 'next-intl/server';
import { PersonsWorkspace } from '@/components/persons-workspace';
import { PageHeader } from '@/components/ui';

export default async function PersonsPage() {
  const t = await getTranslations('pages.persons');

  return (
    <div className="space-y-8">
      <PageHeader title={t('title')} description={t('description')} />
      <PersonsWorkspace />
    </div>
  );
}
