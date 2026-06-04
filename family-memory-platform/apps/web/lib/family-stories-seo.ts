import type { Metadata } from 'next';
import type { PublicFamilyStoryPayloadDto } from '@family/shared';
import { getPublicSiteOrigin, publicStoryCanonicalUrl } from './family-stories-public';

export function buildPublicStoryMetadata(
  payload: PublicFamilyStoryPayloadDto | null,
  opts: { canonicalUrl?: string; indexable?: boolean },
): Metadata {
  if (!payload) {
    return { title: 'Family story', robots: { index: false, follow: false } };
  }

  const description =
    payload.ogDescription?.trim() ||
    payload.narrativeText?.replace(/\s+/g, ' ').trim().slice(0, 160) ||
    undefined;

  const canonical =
    opts.canonicalUrl ??
    (payload.slug && payload.visibility === 'public'
      ? publicStoryCanonicalUrl(payload.slug)
      : undefined);

  const indexable =
    opts.indexable ??
    (payload.visibility === 'public' &&
      payload.publishStatus === 'published' &&
      Boolean(payload.slug));

  return {
    title: payload.title,
    description,
    alternates: canonical ? { canonical } : undefined,
    robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      type: 'article',
      title: payload.title,
      description,
      url: canonical,
      images: payload.coverUrl ? [{ url: payload.coverUrl, alt: payload.title }] : undefined,
      publishedTime: payload.publishedAt ?? undefined,
      modifiedTime: payload.updatedAt ?? undefined,
    },
    twitter: {
      card: payload.coverUrl ? 'summary_large_image' : 'summary',
      title: payload.title,
      description,
      images: payload.coverUrl ? [payload.coverUrl] : undefined,
    },
  };
}

export function buildPublicStoryJsonLd(
  payload: PublicFamilyStoryPayloadDto,
  pageUrl: string,
): Record<string, unknown> {
  const description =
    payload.ogDescription?.trim() ||
    payload.narrativeText?.replace(/\s+/g, ' ').trim().slice(0, 160);

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: payload.title,
    description: description || undefined,
    image: payload.coverUrl ? [payload.coverUrl] : undefined,
    url: pageUrl,
    datePublished: payload.publishedAt ?? undefined,
    dateModified: payload.updatedAt ?? undefined,
    publisher: {
      '@type': 'Organization',
      name: 'Family Memory Platform',
      url: getPublicSiteOrigin(),
    },
  };
}
