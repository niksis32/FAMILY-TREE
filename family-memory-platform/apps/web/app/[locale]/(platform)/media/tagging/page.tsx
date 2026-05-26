import { getTranslations } from 'next-intl/server';
import { BulkTaggingWorkspace } from '@/features/photo-intelligence/bulk-tagging-workspace';
import { PageHeader } from '@/components/ui';

export default async function MediaBulkTaggingPage() {
  const t = await getTranslations('photoIntelligence');

  return (
    <div className="space-y-8">
      <PageHeader title={t('bulkTaggingTitle')} description={t('bulkTaggingDesc')} />
      <BulkTaggingWorkspace />
    </div>
  );
}
