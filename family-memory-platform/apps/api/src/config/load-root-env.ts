import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/** Infra env prefixes loaded from the monorepo root `.env` (see scripts/api-start.mjs). */
export const API_INFRA_ENV_PREFIXES = ['MINIO_', 'MEILI_', 'REDIS_'] as const;

function findRepoRoot(startDir: string): string {
  let dir = resolve(startDir);

  while (true) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml')) || existsSync(join(dir, '.env'))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      return resolve(startDir);
    }
    dir = parent;
  }
}

function parseEnvFile(content: string): Record<string, string> {
  const vars: Record<string, string> = {};

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

function expandEnvVars(vars: Record<string, string>): Record<string, string> {
  const expanded = { ...vars };
  let changed = true;

  while (changed) {
    changed = false;
    for (const [key, value] of Object.entries(expanded)) {
      const next = value.replace(/\$\{([^}]+)\}/g, (_, name: string) => {
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

/** Resolve absolute path to the monorepo root `.env` (independent of process.cwd()). */
export function resolveRootEnvPath(): string {
  // dist/config or src/config → apps/api → repo root
  const repoRoot = findRepoRoot(join(__dirname, '../../..'));
  return join(repoRoot, '.env');
}

/**
 * Load root `.env` into process.env before NestJS ConfigModule initializes.
 * Does not override variables already set in the shell (Docker/K8s friendly).
 */
export function loadRootEnv(): { envPath: string; loadedKeys: string[] } {
  const envPath = resolveRootEnvPath();

  if (!existsSync(envPath)) {
    return { envPath, loadedKeys: [] };
  }

  const parsed = expandEnvVars(parseEnvFile(readFileSync(envPath, 'utf8')));
  const loadedKeys: string[] = [];

  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined || process.env[key] === '') {
      process.env[key] = value;
      loadedKeys.push(key);
    }
  }

  return { envPath, loadedKeys };
}
