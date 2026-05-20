#!/usr/bin/env node
/**
 * Run Prisma CLI with env from repo root `.env` (variant A: Postgres on localhost).
 * Usage: node scripts/prisma-cli.mjs migrate dev
 */
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const apiDir = join(root, 'apps', 'api');
const envPath = join(root, '.env');

function loadEnvFile(path) {
  if (!existsSync(path)) {
    console.error(`Файл .env не найден: ${path}`);
    console.error('Скопируйте: cp .env.example .env');
    process.exit(1);
  }

  for (const line of readFileSync(path, 'utf8').split('\n')) {
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
}

loadEnvFile(envPath);

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL не задан в .env');
  process.exit(1);
}

const args = process.argv.slice(2).join(' ');
if (!args) {
  console.error('Укажите команду Prisma, например: migrate dev');
  process.exit(1);
}

function resolvePrismaCommand(prismaArgs) {
  try {
    const requireFromApi = createRequire(join(apiDir, 'package.json'));
    const prismaPkg = requireFromApi.resolve('prisma/package.json');
    const prismaBin = join(dirname(prismaPkg), 'build', 'index.js');
    if (existsSync(prismaBin)) {
      return { cmd: `node "${prismaBin}" ${prismaArgs}`, cwd: apiDir };
    }
  } catch {
    /* fallback below */
  }
  return { cmd: `pnpm exec prisma ${prismaArgs}`, cwd: apiDir };
}

const { cmd, cwd } = resolvePrismaCommand(args);

console.log(`Prisma (${cwd}), DATABASE_URL host: ${process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] ?? '?'}`);

execSync(cmd, { cwd, stdio: 'inherit', env: process.env, shell: true });
