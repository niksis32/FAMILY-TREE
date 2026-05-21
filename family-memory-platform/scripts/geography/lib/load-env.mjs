import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Repo root (family-memory-platform) */
const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');

export function loadRootEnv() {
  const envPath = join(root, '.env');
  if (!existsSync(envPath)) {
    console.error(`Файл .env не найден: ${envPath}`);
    console.error('Скопируйте: cp .env.example .env');
    process.exit(1);
  }

  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    value = value.replace(/\$\{([^}]+)\}/g, (_, name) => process.env[name] ?? '');
    if (!(key in process.env) || process.env[key] === '') {
      process.env[key] = value;
    }
  }

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL не задан в .env');
    process.exit(1);
  }
}
