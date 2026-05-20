#!/usr/bin/env sh
# Create a Neo4j database dump for the optional graph profile.
set -eu

BACKUP_DIR="$(cd "$(dirname "$0")/.." && pwd)/backups/neo4j"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
TARGET_DIR="$BACKUP_DIR/$TIMESTAMP"
NEO4J_DATABASE="${NEO4J_DATABASE:-neo4j}"

mkdir -p "$TARGET_DIR"

if ! docker ps --format '{{.Names}}' | grep -qx 'family_neo4j'; then
  echo "family_neo4j is not running. Start it with the graph profile first."
  exit 1
fi

docker exec family_neo4j sh -c "
  set -eu
  rm -rf /tmp/family-backups
  mkdir -p /tmp/family-backups
  neo4j-admin database dump '$NEO4J_DATABASE' \
    --to-path=/tmp/family-backups \
    --overwrite-destination=true
"

docker cp "family_neo4j:/tmp/family-backups/$NEO4J_DATABASE.dump" "$TARGET_DIR/"
docker exec family_neo4j rm -rf /tmp/family-backups

echo "Neo4j dump saved to: $TARGET_DIR/$NEO4J_DATABASE.dump"
