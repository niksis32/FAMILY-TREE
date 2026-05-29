import { getTranslations } from 'next-intl/server';
import { BulkTaggingWorkspace } from '@/features/photo-intelligence/bulk-tagging-workspace';
import { PageHero } from '@family/ui';

export default async function MediaBulkTaggingPage() {
  const t = await getTranslations('photoIntelligence');

  return (
    <div className="space-y-8">
      <PageHero eyebrow={t('workspaceEyebrow')} title={t('bulkTaggingTitle')} description={t('bulkTaggingDesc')} />
      <BulkTaggingWorkspace />
    </div>
  );
}
