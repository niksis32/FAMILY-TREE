import type { PublicFamilyStoryPayloadDto, PublicStorySitemapDto } from '@family/shared';
import { DEFAULT_APP_LOCALE } from '@family/shared';
import { getApiBaseUrl } from '@/lib/api-base-url';

export function getPublicSiteOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    'http://localhost:3000';
  return raw.replace(/\/$/, '');
}

/** Canonical SEO URL for a PUBLIC story (default locale prefix). */
export function publicStoryCanonicalUrl(slug: string, locale = DEFAULT_APP_LOCALE): string {
  return `${getPublicSiteOrigin()}/${locale}/p/${encodeURIComponent(slug)}`;
}

export async function fetchPublicStoryByToken(
  token: string,
): Promise<PublicFamilyStoryPayloadDto | null> {
  const res = await fetch(
    `${getApiBaseUrl()}/public/family-stories/token/${encodeURIComponent(token)}`,
    { cache: 'no-store' },
  );
  if (!res.ok) return null;
  return res.json();
}

export async function fetchPublicStoryBySlug(
  slug: string,
): Promise<PublicFamilyStoryPayloadDto | null> {
  const res = await fetch(
    `${getApiBaseUrl()}/public/family-stories/slug/${encodeURIComponent(slug)}`,
    { next: { revalidate: 60 } },
  );
  if (!res.ok) return null;
  return res.json();
}

export async function fetchPublicStorySitemap(): Promise<PublicStorySitemapDto> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/public/family-stories/sitemap`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return { entries: [] };
    return res.json();
  } catch {
    // API unavailable during `next build` (Docker) or transient outage — sitemap still works without stories.
    return { entries: [] };
  }
}

export function publicStoryPdfUrl(token: string): string {
  return `${getApiBaseUrl()}/public/family-stories/token/${encodeURIComponent(token)}/pdf`;
}
