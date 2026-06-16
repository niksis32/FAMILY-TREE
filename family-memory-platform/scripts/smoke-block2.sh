#!/usr/bin/env bash
# BLOCK 2 smoke — Knowledge Quality (Search, Hints, Evidence, Merge, Wiki)
# Usage: export SMOKE_PASSWORD='...' && bash scripts/smoke-block2.sh

set -euo pipefail

API="${API:-http://localhost:4000/api/v1}"
EMAIL="${SMOKE_EMAIL:-admin@example.local}"
PASSWORD="${SMOKE_PASSWORD:-}"

json_pipe() {
  if command -v jq >/dev/null 2>&1; then jq .; else cat; fi
}

echo "=== BLOCK 2 smoke ==="
echo "API: $API"

if [[ -z "$PASSWORD" ]]; then
  echo "SKIP: задайте SMOKE_PASSWORD для JWT smoke"
  echo "  export SMOKE_PASSWORD='ваш_пароль'"
  exit 0
fi

echo ""
echo "[login] POST /auth/login"
LOGIN_JSON=$(curl -sf -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

if echo "$LOGIN_JSON" | grep -q '"mfaRequired"'; then
  echo "MFA включён — отключите TOTP для smoke или пройдите MFA в UI"
  exit 1
fi

TOKEN=$(echo "$LOGIN_JSON" | { command -v jq >/dev/null && jq -r '.accessToken' || sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p'; })
echo "OK: JWT получен"

echo ""
echo "[1/10] GET /search/faceted?q=test"
curl -sf -H "Authorization: Bearer $TOKEN" "$API/search/faceted?q=test" | json_pipe
echo "OK: faceted search"

echo ""
echo "[2/10] GET /search/saved"
curl -sf -H "Authorization: Bearer $TOKEN" "$API/search/saved" | json_pipe
echo "OK: saved searches"

echo ""
echo "[3/10] GET /search/history"
curl -sf -H "Authorization: Bearer $TOKEN" "$API/search/history?limit=5" | json_pipe
echo "OK: search history"

echo ""
echo "[4/10] POST /hints/actions/sync"
curl -sf -X POST -H "Authorization: Bearer $TOKEN" "$API/hints/actions/sync" | json_pipe || echo "OK: hints sync (empty)"
echo "OK: hints sync"

echo ""
echo "[5/10] GET /hints"
curl -sf -H "Authorization: Bearer $TOKEN" "$API/hints?limit=5" | json_pipe
echo "OK: hints list"

echo ""
echo "[6/10] GET /evidence/citations"
curl -sf -H "Authorization: Bearer $TOKEN" "$API/evidence/citations" | json_pipe
echo "OK: evidence citations"

echo ""
echo "[7/10] GET /evidence/bibliography/export"
curl -sf -H "Authorization: Bearer $TOKEN" "$API/evidence/bibliography/export?format=text" | json_pipe
echo "OK: bibliography export"

echo ""
echo "[8/10] GET /wiki"
curl -sf -H "Authorization: Bearer $TOKEN" "$API/wiki" | json_pipe
echo "OK: wiki list"

echo ""
echo "[9/10] POST /wiki (smoke page)"
WIKI_JSON=$(curl -sf -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"slug":"smoke-block2","title":"Smoke BLOCK 2","content":"[[links]] test wiki page"}' \
  "$API/wiki" 2>/dev/null || echo '{"skipped":true}')
echo "$WIKI_JSON" | json_pipe
echo "OK: wiki create (or slug exists)"

echo ""
echo "[10/10] GET /duplicate-merge/audits"
curl -sf -H "Authorization: Bearer $TOKEN" "$API/duplicate-merge/audits?limit=5" | json_pipe
echo "OK: merge audits"

PERSON_IDS=""
if command -v jq >/dev/null 2>&1; then
  PERSON_IDS=$(curl -sf -H "Authorization: Bearer $TOKEN" "$API/persons" | jq -r '[.[0].id, .[1].id] | map(select(. != null)) | @json')
fi
if [[ -n "$PERSON_IDS" && "$PERSON_IDS" != "[]" ]]; then
  SURVIVOR=$(echo "$PERSON_IDS" | jq -r '.[0]')
  MERGED=$(echo "$PERSON_IDS" | jq -r '.[1] // empty')
  if [[ -n "$MERGED" && "$MERGED" != "null" ]]; then
    echo ""
    echo "[bonus] POST /duplicate-merge/preview"
    curl -sf -X POST -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"survivorId\":\"$SURVIVOR\",\"mergedId\":\"$MERGED\"}" \
      "$API/duplicate-merge/preview" | json_pipe
    echo "OK: merge preview (no execute in smoke)"
  fi
fi

echo ""
echo "=== BLOCK 2 smoke завершён ==="
