import type { PublicFamilyStoryPayloadDto } from '@family/shared';
import { buildPublicStoryJsonLd } from '@/lib/family-stories-seo';

export function PublicStoryJsonLd({
  payload,
  pageUrl,
}: {
  payload: PublicFamilyStoryPayloadDto;
  pageUrl: string;
}) {
  const data = buildPublicStoryJsonLd(payload, pageUrl);
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
