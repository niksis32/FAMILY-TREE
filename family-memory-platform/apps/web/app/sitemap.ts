import type { MetadataRoute } from 'next';
import { DEFAULT_APP_LOCALE } from '@family/shared';
import { fetchPublicStorySitemap, getPublicSiteOrigin, publicStoryCanonicalUrl } from '@/lib/family-stories-public';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getPublicSiteOrigin();
  const { entries } = await fetchPublicStorySitemap();

  const storyUrls: MetadataRoute.Sitemap = entries.map((entry) => ({
    url: publicStoryCanonicalUrl(entry.slug, DEFAULT_APP_LOCALE),
    lastModified: entry.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [
    {
      url: `${origin}/${DEFAULT_APP_LOCALE}`,
      changeFrequency: 'weekly',
      priority: 1,
    },
    ...storyUrls,
  ];
}
