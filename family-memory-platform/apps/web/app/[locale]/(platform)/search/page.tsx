import { getTranslations } from 'next-intl/server';
import { SearchPanel } from '@/components/search-panel';
import { PageHeader } from '@/components/ui';

export default async function SearchPage() {
  const t = await getTranslations('pages.search');

  return (
    <div className="space-y-8">
      <PageHeader title={t('title')} description={t('description')} />
      <SearchPanel />
    </div>
  );
}
