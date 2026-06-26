import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** Monorepo: transpile workspace packages */
const nextConfig: NextConfig = {
  transpilePackages: ['@family/ui', '@family/shared'],
  output: 'standalone',
  async rewrites() {
    return [
      // PWA assets live in /public — next-intl prefixes locale in metadata URLs
      { source: '/:locale/manifest.webmanifest', destination: '/manifest.webmanifest' },
      { source: '/:locale/sw.js', destination: '/sw.js' },
    ];
  },
};

export default withNextIntl(nextConfig);
