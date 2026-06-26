#!/usr/bin/env bash
# BLOCK 3 smoke — Media & AI Memory Engine
# Usage: export SMOKE_PASSWORD='...' && bash scripts/smoke-block3.sh

set -euo pipefail

API="${API:-http://localhost:4000/api/v1}"
EMAIL="${SMOKE_EMAIL:-admin@example.local}"
PASSWORD="${SMOKE_PASSWORD:-}"

json_pipe() {
  if command -v jq >/dev/null 2>&1; then jq .; else cat; fi
}

echo "=== BLOCK 3 smoke ==="
echo "API: $API"

if [[ -z "$PASSWORD" ]]; then
  echo "SKIP: задайте SMOKE_PASSWORD для JWT smoke"
  exit 0
fi

LOGIN_JSON=$(curl -sf -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

if echo "$LOGIN_JSON" | grep -q '"mfaRequired"'; then
  echo "MFA включён — отключите для smoke"
  exit 1
fi

TOKEN=$(echo "$LOGIN_JSON" | { command -v jq >/dev/null && jq -r '.accessToken' || sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p'; })
WORKSPACE_ID=$(curl -sf -H "Authorization: Bearer $TOKEN" "$API/workspaces/me" | { command -v jq >/dev/null && jq -r '.[0].id' || sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -1; })
HDR=(-H "Authorization: Bearer $TOKEN" -H "X-Workspace-Id: $WORKSPACE_ID")

echo ""
echo "[1/7] GET /media/people/summary"
curl -sf "${HDR[@]}" "$API/media/people/summary" | json_pipe

echo ""
echo "[2/7] GET /face-clusters"
curl -sf "${HDR[@]}" "$API/face-clusters" | json_pipe

echo ""
echo "[3/7] GET /memory-stories"
curl -sf "${HDR[@]}" "$API/memory-stories" | json_pipe

echo ""
echo "[4/7] POST /social-archive-import (demo manifest)"
IMPORT_JSON=$(curl -sf -X POST "${HDR[@]}" -H "Content-Type: application/json" \
  "$API/social-archive-import" \
  -d '{"fileName":"smoke.json","provider":"INSTAGRAM","manifestItems":[{"externalId":"smoke-1","title":"Smoke photo"}]}')
echo "$IMPORT_JSON" | json_pipe
IMPORT_ID=$(echo "$IMPORT_JSON" | { command -v jq >/dev/null && jq -r '.id' || sed -n 's/.*"id":"\([^"]*\)".*/\1/p'; })

echo ""
echo "[5/7] PATCH selection + POST confirm"
curl -sf -X PATCH "${HDR[@]}" -H "Content-Type: application/json" \
  "$API/social-archive-import/$IMPORT_ID/items/selection" \
  -d '{"all":true,"selected":true}' | json_pipe
curl -sf -X POST "${HDR[@]}" -H "Content-Type: application/json" \
  "$API/social-archive-import/$IMPORT_ID/confirm" \
  -d '{}' | json_pipe

echo ""
echo "[6/8] POST /ask-archive"
ASK_JSON=$(curl -sf -X POST "${HDR[@]}" -H "Content-Type: application/json" \
  "$API/ask-archive" \
  -d '{"question":"family archive test","language":"ru"}')
echo "$ASK_JSON" | json_pipe
CITATIONS=$(echo "$ASK_JSON" | { command -v jq >/dev/null && jq '.citations | length' || echo 0; })
echo "Citations count: $CITATIONS"

echo ""
echo "[7/8] POST /face-clusters/rebuild (inline or queued)"
curl -sf -X POST "${HDR[@]}" "$API/face-clusters/rebuild" | json_pipe

echo ""
echo "[8/8] GET /document-ocr status (if documents exist)"
DOC_ID=$(curl -sf "${HDR[@]}" "$API/documents" | { command -v jq >/dev/null && jq -r '.[0].id // empty' || true; })
if [[ -n "$DOC_ID" ]]; then
  curl -sf "${HDR[@]}" "$API/document-ocr/$DOC_ID/status" | json_pipe
else
  echo "SKIP: no documents"
fi

echo ""
echo "OK: BLOCK 3 smoke completed"
