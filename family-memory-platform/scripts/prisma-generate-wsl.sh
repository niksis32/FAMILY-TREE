#!/usr/bin/env bash
# Generate Prisma Client from WSL (variant A). Run from repo root.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "Removing stale Prisma engine temp files..."
find "$ROOT/node_modules" -path '*/.prisma/client/*.tmp*' -delete 2>/dev/null || true

echo "Running prisma generate (native + debian-openssl-3.0.x)..."
pnpm db:generate

echo "Done. Start API: pnpm api:start"
