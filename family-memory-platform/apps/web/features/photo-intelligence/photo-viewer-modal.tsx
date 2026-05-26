'use client';

import { useTranslations } from 'next-intl';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl dark:bg-slate-950">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{title ?? t('photoViewer')}</h2>
            <Link href={`/media/${mediaId}`} className="text-sm text-family-primary hover:underline">
              {t('openFullPage')}
            </Link>
          </div>
          <Button variant="ghost" onClick={onClose}>
            {t('close')}
          </Button>
        </div>
        <PhotoViewerWithTags mediaId={mediaId} compact />
      </div>
    </div>
  );
}
