#!/usr/bin/env sh
# Bootstrap local dev: copy env, start infra, run Prisma migrate (when API is ready)
set -e
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example — update secrets before production."
fi

docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
echo "Infrastructure started. API/Web: run 'pnpm dev' from repo root or use --profile apps."
