#!/usr/bin/env sh
# Create a Meilisearch dump and copy dump files to infra/backups/meilisearch/.
set -eu

BACKUP_DIR="$(cd "$(dirname "$0")/.." && pwd)/backups/meilisearch"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
TARGET_DIR="$BACKUP_DIR/$TIMESTAMP"
MEILI_MASTER_KEY="${MEILI_MASTER_KEY:-family_master_key}"

mkdir -p "$TARGET_DIR"

TASK_RESPONSE="$(
  docker exec family_meilisearch wget -qO- \
    --header="Authorization: Bearer $MEILI_MASTER_KEY" \
    --post-data="" \
    http://127.0.0.1:7700/dumps
)"

TASK_UID="$(printf '%s' "$TASK_RESPONSE" | sed -n 's/.*"taskUid":[[:space:]]*\([0-9][0-9]*\).*/\1/p')"

if [ -z "$TASK_UID" ]; then
  echo "Could not read Meilisearch taskUid from response: $TASK_RESPONSE"
  exit 1
fi

STATUS="enqueued"
while [ "$STATUS" = "enqueued" ] || [ "$STATUS" = "processing" ]; do
  sleep 2
  STATUS_RESPONSE="$(
    docker exec family_meilisearch wget -qO- \
      --header="Authorization: Bearer $MEILI_MASTER_KEY" \
      "http://127.0.0.1:7700/tasks/$TASK_UID"
  )"
  STATUS="$(printf '%s' "$STATUS_RESPONSE" | sed -n 's/.*"status":"\([^"]*\)".*/\1/p')"
done

if [ "$STATUS" != "succeeded" ]; then
  echo "Meilisearch dump task failed or stopped with status: $STATUS"
  echo "$STATUS_RESPONSE"
  exit 1
fi

docker cp family_meilisearch:/meili_data/dumps "$TARGET_DIR"

echo "Meilisearch dump copied to: $TARGET_DIR"
