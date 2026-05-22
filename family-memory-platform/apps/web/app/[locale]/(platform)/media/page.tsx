import { getTranslations } from 'next-intl/server';
import { MediaGallery } from '@/components/media-gallery';
import { PageHeader } from '@/components/ui';

export default async function MediaPage() {
  const t = await getTranslations('pages.media');

  return (
    <div className="space-y-8">
      <PageHeader title={t('title')} description={t('description')} />
      <MediaGallery />
    </div>
  );
}
