#!/usr/bin/env bash
# BLOCK 0 smoke — Security, Privacy, Ops
# Usage: export SMOKE_PASSWORD='...' && bash scripts/smoke-block0.sh

set -euo pipefail

API="${API:-http://localhost:4000/api/v1}"
EMAIL="${SMOKE_EMAIL:-admin@example.local}"
PASSWORD="${SMOKE_PASSWORD:-}"

json_pipe() {
  if command -v jq >/dev/null 2>&1; then
    jq .
  else
    cat
  fi
}

extract_json_string() {
  local key="$1"
  grep -o "\"${key}\":\"[^\"]*\"" | head -1 | cut -d'"' -f4
}

echo "=== BLOCK 0 smoke ==="
echo "API: $API"

echo ""
echo "[5/9] GET /health/deep"
curl -sf "$API/health/deep" | json_pipe
echo "OK: health/deep"

if [[ -z "$PASSWORD" ]]; then
  echo ""
  echo "SKIP [6-8]: задайте SMOKE_PASSWORD для JWT smoke"
  echo "  export SMOKE_PASSWORD='ваш_пароль'"
  exit 0
fi

echo ""
echo "[login] POST /auth/login"
LOGIN_JSON=$(curl -sf -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

if echo "$LOGIN_JSON" | grep -q '"mfaRequired"'; then
  echo "MFA включён — пройдите MFA в UI или отключите TOTP для smoke"
  echo "$LOGIN_JSON" | json_pipe
  exit 1
fi

TOKEN=$(
  if command -v jq >/dev/null 2>&1; then
    echo "$LOGIN_JSON" | jq -r '.accessToken'
  else
    echo "$LOGIN_JSON" | extract_json_string accessToken
  fi
)
if [[ -z "$TOKEN" || "$TOKEN" == "null" ]]; then
  echo "FAIL: не получен accessToken"
  exit 1
fi
echo "OK: JWT получен"

echo ""
echo "[6/9] GET /admin/ops"
curl -sf -H "Authorization: Bearer $TOKEN" "$API/admin/ops" | json_pipe
echo "OK: admin/ops"

echo ""
echo "[7/9] POST /auth/mfa/totp/enroll/start"
curl -sf -X POST -H "Authorization: Bearer $TOKEN" "$API/auth/mfa/totp/enroll/start" | json_pipe
echo "OK: mfa enroll start"

echo ""
echo "[8/9] POST /workspaces/.../exports"
WORKSPACE_ID=""
if command -v jq >/dev/null 2>&1; then
  WORKSPACE_ID=$(curl -sf -H "Authorization: Bearer $TOKEN" "$API/workspaces/me" | jq -r '.[0].id // empty')
else
  WORKSPACE_ID=$(curl -sf -H "Authorization: Bearer $TOKEN" "$API/workspaces/me" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -1)
fi

if [[ -z "$WORKSPACE_ID" || "$WORKSPACE_ID" == "null" ]]; then
  echo "WARN: workspace не найден — пропуск export"
else
  curl -sf -X POST -H "Authorization: Bearer $TOKEN" \
    "$API/workspaces/$WORKSPACE_ID/exports" | json_pipe
  echo "OK: workspace export job (workspace=$WORKSPACE_ID)"
fi

echo ""
echo "[9/9] public share create + resolve"
PERSON_ID=""
if command -v jq >/dev/null 2>&1; then
  PERSON_ID=$(curl -sf -H "Authorization: Bearer $TOKEN" "$API/persons" | jq -r '.[0].id // empty')
else
  PERSON_ID=$(curl -sf -H "Authorization: Bearer $TOKEN" "$API/persons" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -1)
fi

if [[ -z "$PERSON_ID" ]]; then
  echo "WARN: persons пуст — пропуск public share"
else
  SHARE_JSON=$(curl -sf -X POST -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"resourceType\":\"PERSON\",\"resourceId\":\"$PERSON_ID\",\"hideLivingPersons\":true}" \
    "$API/privacy/public-shares")
  RAW_TOKEN=$(
    if command -v jq >/dev/null 2>&1; then
      echo "$SHARE_JSON" | jq -r '.publicToken'
    else
      echo "$SHARE_JSON" | extract_json_string publicToken
    fi
  )
  curl -sf "$API/public/share/$RAW_TOKEN" | json_pipe
  echo "OK: public share resolve (token prefix: ${RAW_TOKEN:0:8}...)"
fi

echo ""
echo "=== BLOCK 0 smoke завершён ==="
