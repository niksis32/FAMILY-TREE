import type { Metadata } from 'next';
import { PublicStoryPage } from '@/features/family-stories/public-story-page';
import { PublicStoryJsonLd } from '@/features/family-stories/public-story-json-ld';
import {
  fetchPublicStoryBySlug,
  publicStoryCanonicalUrl,
} from '@/lib/family-stories-public';
import { buildPublicStoryMetadata } from '@/lib/family-stories-seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const payload = await fetchPublicStoryBySlug(slug);
  return buildPublicStoryMetadata(payload, {
    canonicalUrl: publicStoryCanonicalUrl(slug, locale),
    indexable: true,
  });
}

export default async function PublicStoryBySlugPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const payload = await fetchPublicStoryBySlug(slug);
  if (!payload) {
    return <p className="p-8 text-center text-stone-500">Story not found or not public.</p>;
  }

  const canonicalUrl = publicStoryCanonicalUrl(slug, locale);

  return (
    <>
      <PublicStoryJsonLd payload={payload} pageUrl={canonicalUrl} />
      <PublicStoryPage payload={payload} />
    </>
  );
}
