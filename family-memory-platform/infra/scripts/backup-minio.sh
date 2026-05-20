#!/usr/bin/env sh
# Sync MinIO buckets to infra/backups/minio/<timestamp>/.
set -eu

BACKUP_DIR="$(cd "$(dirname "$0")/.." && pwd)/backups/minio"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
TARGET_DIR="$BACKUP_DIR/$TIMESTAMP"

MINIO_ROOT_USER="${MINIO_ROOT_USER:-family_admin}"
MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:-family_password}"
MINIO_BUCKET_MEDIA="${MINIO_BUCKET_MEDIA:-family-media}"
MINIO_BUCKET_DOCUMENTS="${MINIO_BUCKET_DOCUMENTS:-family-documents}"

mkdir -p "$TARGET_DIR"

docker run --rm \
  --network container:family_minio \
  -e MINIO_ROOT_USER="$MINIO_ROOT_USER" \
  -e MINIO_ROOT_PASSWORD="$MINIO_ROOT_PASSWORD" \
  -e MINIO_BUCKET_MEDIA="$MINIO_BUCKET_MEDIA" \
  -e MINIO_BUCKET_DOCUMENTS="$MINIO_BUCKET_DOCUMENTS" \
  -v "$TARGET_DIR:/backup" \
  --entrypoint /bin/sh \
  minio/mc:latest \
  -c '
    set -eu
    mc alias set local http://127.0.0.1:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"
    mc mirror --overwrite "local/$MINIO_BUCKET_MEDIA" "/backup/$MINIO_BUCKET_MEDIA"
    mc mirror --overwrite "local/$MINIO_BUCKET_DOCUMENTS" "/backup/$MINIO_BUCKET_DOCUMENTS"
  '

echo "MinIO buckets synced to: $TARGET_DIR"
