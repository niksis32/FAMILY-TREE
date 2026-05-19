#!/usr/bin/env sh
# VPS backup helper — dump PostgreSQL to infra/backups/
set -e
BACKUP_DIR="$(dirname "$0")/../backups"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
docker exec family_postgres pg_dump -U "${POSTGRES_USER:-family_user}" "${POSTGRES_DB:-family_platform}" \
  > "$BACKUP_DIR/family_platform_$TIMESTAMP.sql"
echo "Backup saved: $BACKUP_DIR/family_platform_$TIMESTAMP.sql"
