import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const apiPackageJson = join(scriptsDir, '../../../apps/api/package.json');
const require = createRequire(apiPackageJson);

/** Prisma Client из контекста apps/api (pnpm workspace). */
export function createPrismaClient() {
  const { PrismaClient } = require('@prisma/client');
  return new PrismaClient();
}
