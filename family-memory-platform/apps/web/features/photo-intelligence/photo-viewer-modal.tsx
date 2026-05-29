'use client';

import { useTranslations } from 'next-intl';
import { ModalShell } from '@family/ui';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui';
import { PhotoViewerWithTags } from './photo-viewer-with-tags';

interface PhotoViewerModalProps {
  mediaId: string;
  title?: string | null;
  onClose: () => void;
}

export function PhotoViewerModal({ mediaId, title, onClose }: PhotoViewerModalProps) {
  const t = useTranslations('photoIntelligence');

  return (
    <ModalShell
      open
      onClose={onClose}
      title={title ?? t('photoViewer')}
      subtitle={t('photoViewerDesc')}
      size="xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link href={`/media/${mediaId}`} className="text-sm font-semibold text-family-primary dark:text-family-accent">
            {t('openFullPage')} →
          </Link>
          <Button variant="ghost" onClick={onClose}>
            {t('close')}
          </Button>
        </div>
      }
    >
      <PhotoViewerWithTags mediaId={mediaId} compact />
    </ModalShell>
  );
}
