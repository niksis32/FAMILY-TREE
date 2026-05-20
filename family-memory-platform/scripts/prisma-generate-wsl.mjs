#!/usr/bin/env node
/**
 * Prisma generate from WSL/Linux (variant A). Cleans stale .tmp engines, then db:generate.
 */
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const nodeModules = join(root, 'node_modules');

function walkPrismaClient(dir, depth = 0) {
  if (depth > 12 || !existsSync(dir)) return;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === '.prisma') {
        const client = join(p, 'client');
        if (existsSync(client)) {
          for (const f of readdirSync(client)) {
            if (f.includes('.tmp') || f.startsWith('query_engine')) {
              try {
                rmSync(join(client, f), { force: true, recursive: true });
              } catch {
                /* locked on /mnt/d — unlock from Windows PowerShell first */
              }
            }
          }
        }
      } else {
        walkPrismaClient(p, depth + 1);
      }
    }
  }
}

if (existsSync(nodeModules)) {
  walkPrismaClient(nodeModules);
}

console.log('Running pnpm db:generate (with root .env)...');
execSync('node scripts/prisma-cli.mjs generate', { cwd: root, stdio: 'inherit', env: process.env });
