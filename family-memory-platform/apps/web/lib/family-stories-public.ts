import type { PublicFamilyStoryPayloadDto, PublicStorySitemapDto } from '@family/shared';
import { API_PREFIX, DEFAULT_APP_LOCALE } from '@family/shared';

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? `http://localhost:4000${API_PREFIX}`;

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
    `${apiBase}/public/family-stories/token/${encodeURIComponent(token)}`,
    { cache: 'no-store' },
  );
  if (!res.ok) return null;
  return res.json();
}

export async function fetchPublicStoryBySlug(
  slug: string,
): Promise<PublicFamilyStoryPayloadDto | null> {
  const res = await fetch(
    `${apiBase}/public/family-stories/slug/${encodeURIComponent(slug)}`,
    { next: { revalidate: 60 } },
  );
  if (!res.ok) return null;
  return res.json();
}

export async function fetchPublicStorySitemap(): Promise<PublicStorySitemapDto> {
  const res = await fetch(`${apiBase}/public/family-stories/sitemap`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) return { entries: [] };
  return res.json();
}

export function publicStoryPdfUrl(token: string): string {
  return `${apiBase}/public/family-stories/token/${encodeURIComponent(token)}/pdf`;
}
