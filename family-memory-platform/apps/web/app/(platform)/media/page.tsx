import { MediaCard } from '@/components/domain';
import { MediaUploader } from '@/components/media-uploader';
import { PageHeader } from '@/components/ui';
import { mediaItems } from '@/lib/mock-data';

export default function MediaPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Медиаархив"
        description="Фото, видео и voice stories: файлы физически уходят в MinIO, а metadata сохраняется в PostgreSQL."
      />
      <MediaUploader />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {mediaItems.map((item) => (
          <MediaCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
