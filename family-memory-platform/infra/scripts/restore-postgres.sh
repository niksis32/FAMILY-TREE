#!/usr/bin/env sh
# Restore PostgreSQL from a plain SQL dump created by backup-postgres.sh.
set -eu

if [ "${RESTORE_CONFIRM:-}" != "YES" ]; then
  echo "Refusing to restore without explicit confirmation."
  echo "Run: RESTORE_CONFIRM=YES $0 path/to/backup.sql"
  exit 1
fi

if [ "$#" -ne 1 ]; then
  echo "Usage: RESTORE_CONFIRM=YES $0 path/to/backup.sql"
  exit 1
fi

BACKUP_FILE="$1"
POSTGRES_DB="${POSTGRES_DB:-family_platform}"
POSTGRES_USER="${POSTGRES_USER:-family_user}"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE"
  exit 1
fi

docker exec -i family_postgres psql \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  -v ON_ERROR_STOP=1 < "$BACKUP_FILE"

echo "PostgreSQL restore completed from: $BACKUP_FILE"
