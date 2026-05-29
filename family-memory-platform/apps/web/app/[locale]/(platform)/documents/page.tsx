import { getTranslations } from 'next-intl/server';
import { DocumentsWorkspace } from '@/components/documents-workspace';
import { PageHero } from '@family/ui';

export default async function DocumentsPage() {
  const t = await getTranslations('pages.documents');

  return (
    <div className="space-y-8">
      <PageHero eyebrow={t('eyebrow')} title={t('title')} description={t('description')} />
      <DocumentsWorkspace />
    </div>
  );
}
