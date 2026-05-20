#!/usr/bin/env sh
# VPS backup helper — dump PostgreSQL to infra/backups/postgres/
set -eu

BACKUP_DIR="$(cd "$(dirname "$0")/.." && pwd)/backups/postgres"
POSTGRES_DB="${POSTGRES_DB:-family_platform}"
POSTGRES_USER="${POSTGRES_USER:-family_user}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/${POSTGRES_DB}_$TIMESTAMP.sql"

mkdir -p "$BACKUP_DIR"

docker exec family_postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$BACKUP_FILE"

echo "PostgreSQL backup saved: $BACKUP_FILE"
