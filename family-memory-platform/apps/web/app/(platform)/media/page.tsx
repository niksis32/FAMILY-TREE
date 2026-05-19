import { MediaCard, MediaUploader } from '@/components/domain';
import { PageHeader } from '@/components/ui';
import { mediaItems } from '@/lib/mock-data';

export default function MediaPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Медиаархив"
        description="Фото, видео и voice stories с будущей загрузкой в MinIO, привязкой к персонам и контролем приватности."
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
