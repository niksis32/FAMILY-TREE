import { getTranslations } from 'next-intl/server';
import { PhotoViewerWithTags } from '@/features/photo-intelligence/photo-viewer-with-tags';
import { PageHeader } from '@/components/ui';
import { Link } from '@/i18n/navigation';

export default async function MediaPhotoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations('photoIntelligence');

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('photoViewer')}
        description={t('photoViewerDesc')}
        action={
          <Link href="/media/tagging" className="text-sm text-family-primary hover:underline">
            {t('bulkTaggingLink')}
          </Link>
        }
      />
      <PhotoViewerWithTags mediaId={id} />
    </div>
  );
}
