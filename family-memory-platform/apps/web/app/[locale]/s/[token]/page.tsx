import type { Metadata } from 'next';
import { PublicStoryPage } from '@/features/family-stories/public-story-page';
import { PublicStoryJsonLd } from '@/features/family-stories/public-story-json-ld';
import {
  fetchPublicStoryByToken,
  getPublicSiteOrigin,
  publicStoryPdfUrl,
} from '@/lib/family-stories-public';
import { buildPublicStoryMetadata } from '@/lib/family-stories-seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const payload = await fetchPublicStoryByToken(token);
  return buildPublicStoryMetadata(payload, { indexable: false });
}

export default async function PublicStoryRoutePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const payload = await fetchPublicStoryByToken(token);
  if (!payload) {
    return <p className="p-8 text-center text-stone-500">Story not found or link revoked.</p>;
  }

  const pageUrl = `${getPublicSiteOrigin()}/s/${encodeURIComponent(token)}`;

  return (
    <>
      <PublicStoryJsonLd payload={payload} pageUrl={pageUrl} />
      <PublicStoryPage payload={payload} pdfHref={publicStoryPdfUrl(token)} />
    </>
  );
}
