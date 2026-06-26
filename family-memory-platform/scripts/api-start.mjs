#!/usr/bin/env node
/**
 * Start the NestJS API with env from the monorepo root `.env`.
 *
 * Loads MINIO_*, MEILI_*, REDIS_* (and DATABASE_URL, JWT_*, etc.) before `node dist/main.js`.
 * Root script: pnpm api:start
 *
 * Infra must be running: pnpm docker:infra (Postgres, Redis, MinIO, Meilisearch).
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { API_INFRA_ENV_PREFIXES, findRepoRoot, loadRootEnv } from './load-root-env.mjs';

const root = findRepoRoot(join(fileURLToPath(new URL('.', import.meta.url)), '..'));
const apiDir = join(root, 'apps', 'api');
const mainJs = join(apiDir, 'dist', 'main.js');

const { envPath, loadedKeys } = loadRootEnv({ strict: false });

const infraKeys = loadedKeys.filter((key) =>
  API_INFRA_ENV_PREFIXES.some((prefix) => key.startsWith(prefix)),
);

console.log(`[api:start] env file: ${envPath}`);
if (infraKeys.length > 0) {
  console.log(`[api:start] loaded infra vars: ${infraKeys.join(', ')}`);
} else if (existsSync(envPath)) {
  console.warn(
    `[api:start] warning: no MINIO_/MEILI_/REDIS_ vars loaded from ${envPath} — check .env or shell overrides`,
  );
} else {
  console.warn(`[api:start] warning: ${envPath} missing — copy .env.example to .env`);
}

if (!existsSync(mainJs)) {
  console.error(`[api:start] ${mainJs} not found — run: pnpm api:build`);
  process.exit(1);
}

const port = Number(process.env.API_PORT || 4000);
if (process.env.API_START_KEEP_PORT !== '1' && process.platform !== 'win32') {
  try {
    const listeners = execSync(`ss -lptn "sport = :${port}" 2>/dev/null || true`, {
      encoding: 'utf8',
    });
    if (listeners.includes(`:${port}`)) {
      console.warn(`[api:start] port ${port} busy — stopping previous listener`);
      execSync(`fuser -k ${port}/tcp 2>/dev/null || true`, { stdio: 'ignore', shell: true });
      try {
        const pids = execSync(`lsof -ti:${port} 2>/dev/null || true`, { encoding: 'utf8' }).trim();
        if (pids) {
          execSync(`kill -9 ${pids.replace(/\s+/g, ' ')}`, { stdio: 'ignore', shell: true });
        }
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ss/lsof unavailable — proceed and let Node report EADDRINUSE */
  }
}

execSync('node dist/main.js', {
  cwd: apiDir,
  stdio: 'inherit',
  env: process.env,
});
