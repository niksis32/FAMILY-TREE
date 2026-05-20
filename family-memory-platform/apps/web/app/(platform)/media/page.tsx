import { MediaGallery } from '@/components/media-gallery';
import { MediaUploader } from '@/components/media-uploader';
import { PageHeader } from '@/components/ui';

export default function MediaPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Медиаархив"
        description="Фото, видео и voice stories: файлы физически уходят в MinIO, а metadata сохраняется в PostgreSQL."
      />
      <MediaUploader />
      <MediaGallery />
    </div>
  );
}
