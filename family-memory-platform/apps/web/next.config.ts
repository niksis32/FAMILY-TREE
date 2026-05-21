import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** Monorepo: transpile workspace packages */
const nextConfig: NextConfig = {
  transpilePackages: ['@family/ui', '@family/shared'],
  output: 'standalone',
};

export default withNextIntl(nextConfig);
