#!/usr/bin/env bash
# Generate production secrets and public URLs in repo root .env
# Usage:
#   ./infra/scripts/generate-prod-secrets.sh
#   APP_DOMAIN=familymemory.pro ./infra/scripts/generate-prod-secrets.sh .env
#   USE_HTTPS=true APP_DOMAIN=familymemory.pro ./infra/scripts/generate-prod-secrets.sh .env
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

ENV_FILE="${1:-.env}"
APP_DOMAIN="${APP_DOMAIN:-familymemory.pro}"
VPS_IP="${VPS_IP:-38.135.104.31}"
USE_HTTPS="${USE_HTTPS:-false}"

if [ ! -f "$ENV_FILE" ]; then
  cp .env.example "$ENV_FILE"
  echo "Created $ENV_FILE from .env.example"
fi

BACKUP="${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$ENV_FILE" "$BACKUP"
echo "Backup: $BACKUP"

rand_hex() { openssl rand -hex "$1"; }

POSTGRES_PASSWORD="$(rand_hex 24)"
MINIO_ROOT_PASSWORD="$(rand_hex 24)"
MEILI_MASTER_KEY="$(rand_hex 32)"
JWT_SECRET="$(rand_hex 48)"
NEO4J_PASSWORD="$(rand_hex 24)"

set_kv() {
  local key="$1" val="$2"
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
  fi
}

set_kv POSTGRES_PASSWORD "$POSTGRES_PASSWORD"
set_kv MINIO_ROOT_PASSWORD "$MINIO_ROOT_PASSWORD"
set_kv MEILI_MASTER_KEY "$MEILI_MASTER_KEY"
set_kv JWT_SECRET "$JWT_SECRET"
set_kv NEO4J_PASSWORD "$NEO4J_PASSWORD"

PG_USER="$(grep '^POSTGRES_USER=' "$ENV_FILE" | cut -d= -f2- || echo family_user)"
PG_DB="$(grep '^POSTGRES_DB=' "$ENV_FILE" | cut -d= -f2- || echo family_platform)"
PG_HOST="$(grep '^POSTGRES_HOST=' "$ENV_FILE" | cut -d= -f2- || echo localhost)"
PG_PORT="$(grep '^POSTGRES_PORT=' "$ENV_FILE" | cut -d= -f2- || echo 5432)"
set_kv DATABASE_URL "postgresql://${PG_USER}:${POSTGRES_PASSWORD}@${PG_HOST}:${PG_PORT}/${PG_DB}?schema=public"

set_kv NODE_ENV production
set_kv AI_SERVICE_ENABLED false
set_kv NEO4J_ENABLED false

if [ -n "$APP_DOMAIN" ]; then
  if [ "$USE_HTTPS" = "true" ]; then
    SCHEME="https"
  else
    SCHEME="http"
  fi
  set_kv APP_URL "${SCHEME}://${APP_DOMAIN}"
  set_kv API_URL "${SCHEME}://${APP_DOMAIN}/api"
  set_kv NEXT_PUBLIC_API_URL "${SCHEME}://${APP_DOMAIN}/api/v1"
else
  set_kv APP_URL "http://${VPS_IP}"
  set_kv API_URL "http://${VPS_IP}/api"
  set_kv NEXT_PUBLIC_API_URL "http://${VPS_IP}/api/v1"
fi

chmod 600 "$ENV_FILE"

echo ""
echo "=== Secrets generated ==="
echo "POSTGRES_PASSWORD=$POSTGRES_PASSWORD"
echo "MINIO_ROOT_PASSWORD=$MINIO_ROOT_PASSWORD"
echo "MEILI_MASTER_KEY=$MEILI_MASTER_KEY"
echo "JWT_SECRET=$JWT_SECRET"
echo "NEO4J_PASSWORD=$NEO4J_PASSWORD"
echo ""
echo "=== Public URLs ==="
grep -E '^(APP_URL|API_URL|NEXT_PUBLIC_API_URL)=' "$ENV_FILE"
echo ""
echo "Save secrets to a password manager."
echo ""

if grep -qE 'change_me|family_password|family_master_key' "$ENV_FILE"; then
  echo "WARNING: default secrets remain:"
  grep -E 'change_me|family_password|family_master_key' "$ENV_FILE" || true
  exit 1
fi

echo "OK: no default secrets in $ENV_FILE"
