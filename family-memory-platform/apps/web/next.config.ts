import type { NextConfig } from 'next';

/** Monorepo: transpile workspace packages */
const nextConfig: NextConfig = {
  transpilePackages: ['@family/ui', '@family/shared'],
  output: 'standalone',
};

export default nextConfig;
