#!/usr/bin/env node
/**
 * Load environment variables from the monorepo root `.env`.
 * Used by API start wrapper and other root scripts (Prisma CLI, etc.).
 *
 * Required for API infra vars: MINIO_*, MEILI_*, REDIS_* (plus DATABASE_URL, JWT_*).
 * Supports ${VAR} expansion (e.g. REDIS_URL=redis://${REDIS_HOST}:${REDIS_PORT}).
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = join(__dirname, '..');

/** Prefixes the API reads for MinIO, Meilisearch, and Redis/BullMQ. */
export const API_INFRA_ENV_PREFIXES = ['MINIO_', 'MEILI_', 'REDIS_'];

/**
 * @param {string} [startDir]
 * @returns {string}
 */
export function findRepoRoot(startDir = DEFAULT_ROOT) {
  let dir = startDir;
  while (true) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml')) || existsSync(join(dir, '.env'))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      return DEFAULT_ROOT;
    }
    dir = parent;
  }
}

/**
 * @param {string} content
 * @returns {Record<string, string>}
 */
export function parseEnvFile(content) {
  /** @type {Record<string, string>} */
  const vars = {};

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    vars[key] = value;
  }

  return vars;
}

/**
 * @param {Record<string, string>} vars
 * @returns {Record<string, string>}
 */
export function expandEnvVars(vars) {
  /** @type {Record<string, string>} */
  const expanded = { ...vars };
  let changed = true;

  while (changed) {
    changed = false;
    for (const [key, value] of Object.entries(expanded)) {
      const next = value.replace(/\$\{([^}]+)\}/g, (_, name) => {
        return expanded[name] ?? process.env[name] ?? '';
      });
      if (next !== value) {
        expanded[key] = next;
        changed = true;
      }
    }
  }

  return expanded;
}

/**
 * @param {{ envPath?: string; requiredPrefixes?: string[]; strict?: boolean }} [options]
 * @returns {{ envPath: string; loadedKeys: string[] }}
 */
export function loadRootEnv(options = {}) {
  const repoRoot = findRepoRoot();
  const envPath = options.envPath ?? join(repoRoot, '.env');

  if (!existsSync(envPath)) {
    if (options.strict) {
      console.error(`Root .env not found: ${envPath}`);
      console.error('Copy template: cp .env.example .env');
      process.exit(1);
    }
    return { envPath, loadedKeys: [] };
  }

  const parsed = expandEnvVars(parseEnvFile(readFileSync(envPath, 'utf8')));
  /** @type {string[]} */
  const loadedKeys = [];

  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined || process.env[key] === '') {
      process.env[key] = value;
      loadedKeys.push(key);
    }
  }

  if (options.requiredPrefixes?.length) {
    const missing = options.requiredPrefixes.filter((prefix) =>
      !Object.keys(process.env).some(
        (key) => key.startsWith(prefix) && process.env[key] !== undefined && process.env[key] !== '',
      ),
    );
    if (missing.length > 0 && options.strict) {
      console.error(`Missing env vars with prefixes: ${missing.join(', ')}`);
      console.error(`Check ${envPath}`);
      process.exit(1);
    }
  }

  return { envPath, loadedKeys };
}
