'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { MediaGallery } from '@/components/media-gallery';
import { MediaUploader } from '@/components/media-uploader';
import { PageHero } from '@family/ui';

export default function MediaPage() {
  const t = useTranslations('pages.media');
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-8">
      <PageHero eyebrow={t('eyebrow')} title={t('title')} description={t('description')} />
      <MediaUploader onUploaded={() => setRefreshKey((k) => k + 1)} />
      <MediaGallery refreshKey={refreshKey} />
    </div>
  );
}
