import type { MetadataRoute } from 'next';
import { getPublicSiteOrigin } from '@/lib/family-stories-public';

export default function robots(): MetadataRoute.Robots {
  const origin = getPublicSiteOrigin();

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/*/p/'],
        disallow: ['/*/dashboard', '/*/login', '/*/settings', '/*/s/'],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
  };
}
