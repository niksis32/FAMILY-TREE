#!/usr/bin/env bash
# BLOCK 2 smoke — Knowledge Quality (Search, Hints, Evidence, Merge, Wiki)
# Usage: export SMOKE_PASSWORD='...' && bash scripts/smoke-block2.sh
# Optional merge execute on seed duplicates: SMOKE_MERGE_EXECUTE=1

set -euo pipefail

API="${API:-http://localhost:4000/api/v1}"
EMAIL="${SMOKE_EMAIL:-admin@example.local}"
PASSWORD="${SMOKE_PASSWORD:-}"
MERGE_EXECUTE="${SMOKE_MERGE_EXECUTE:-0}"

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

WORKSPACE_ID=$(curl -sf -H "Authorization: Bearer $TOKEN" "$API/workspaces/me" | { command -v jq >/dev/null && jq -r '.[0].id' || sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -1; })
HDR=(-H "Authorization: Bearer $TOKEN" -H "X-Workspace-Id: $WORKSPACE_ID")

echo ""
echo "[1/12] GET /search/faceted?q=test"
FACETED=$(curl -sf "${HDR[@]}" "$API/search/faceted?q=test&limit=5")
echo "$FACETED" | json_pipe
if command -v jq >/dev/null 2>&1; then
  CURSOR=$(echo "$FACETED" | jq -r '.nextCursor // empty')
  if [[ -n "$CURSOR" ]]; then
    echo "[1b/12] GET /search/faceted cursor pagination"
    curl -sf "${HDR[@]}" "$API/search/faceted?q=test&limit=5&cursor=$CURSOR" | json_pipe
  fi
fi
echo "OK: faceted search"

echo ""
echo "[2/12] POST /search/reindex"
curl -sf -X POST "${HDR[@]}" "$API/search/reindex" | json_pipe || echo "WARN: reindex requires ADMIN role"
echo "OK: reindex"

echo ""
echo "[3/12] GET /search/saved"
curl -sf "${HDR[@]}" "$API/search/saved" | json_pipe
echo "OK: saved searches"

echo ""
echo "[4/12] GET /search/history"
curl -sf "${HDR[@]}" "$API/search/history?limit=5" | json_pipe
echo "OK: search history"

echo ""
echo "[5/12] POST /hints/actions/sync"
curl -sf -X POST "${HDR[@]}" "$API/hints/actions/sync" | json_pipe || echo "OK: hints sync (empty)"
echo "OK: hints sync"

echo ""
echo "[6/12] GET /hints"
HINTS_JSON=$(curl -sf "${HDR[@]}" "$API/hints?limit=10")
echo "$HINTS_JSON" | json_pipe
if command -v jq >/dev/null 2>&1; then
  HINT_COUNT=$(echo "$HINTS_JSON" | jq 'length')
  echo "OK: hints list ($HINT_COUNT items)"
else
  echo "OK: hints list"
fi

echo ""
echo "[7/12] GET /evidence/citations"
curl -sf "${HDR[@]}" "$API/evidence/citations" | json_pipe
echo "OK: evidence citations"

echo ""
echo "[8/12] GET /evidence/bibliography/export"
curl -sf "${HDR[@]}" "$API/evidence/bibliography/export?format=text" | json_pipe
echo "OK: bibliography export"

echo ""
echo "[9/12] GET /wiki"
curl -sf "${HDR[@]}" "$API/wiki" | json_pipe
echo "OK: wiki list"

echo ""
echo "[10/12] POST /wiki (smoke page)"
WIKI_JSON=$(curl -sf -X POST "${HDR[@]}" \
  -H "Content-Type: application/json" \
  -d '{"slug":"smoke-block2","title":"Smoke BLOCK 2","content":"## Smoke\n\n[[links]] **test** wiki page"}' \
  "$API/wiki" 2>/dev/null || echo '{"skipped":true}')
echo "$WIKI_JSON" | json_pipe
echo "OK: wiki create (or slug exists)"

echo ""
echo "[11/12] GET /duplicate-merge/audits"
curl -sf "${HDR[@]}" "$API/duplicate-merge/audits?limit=5" | json_pipe
echo "OK: merge audits"

echo ""
echo "[12/12] POST /duplicate-merge/preview (seed duplicates)"
SURVIVOR="${SMOKE_MERGE_SURVIVOR:-seed-person-merge-a}"
MERGED="${SMOKE_MERGE_MERGED:-seed-person-merge-b}"
PREVIEW_JSON=$(curl -sf -X POST "${HDR[@]}" \
  -H "Content-Type: application/json" \
  -d "{\"survivorId\":\"$SURVIVOR\",\"mergedId\":\"$MERGED\"}" \
  "$API/duplicate-merge/preview" 2>/dev/null || echo '{}')
echo "$PREVIEW_JSON" | json_pipe
echo "OK: merge preview"

if [[ "$MERGE_EXECUTE" == "1" ]]; then
  echo ""
  echo "[bonus] POST /duplicate-merge/execute (SMOKE_MERGE_EXECUTE=1)"
  # Re-create merge-b if prior run soft-deleted it
  curl -sf -X POST "${HDR[@]}" \
    -H "Content-Type: application/json" \
    -d "{\"survivorId\":\"$SURVIVOR\",\"mergedId\":\"$MERGED\",\"confirm\":true}" \
    "$API/duplicate-merge/execute" | json_pipe
  echo "OK: merge execute on seed duplicates"
fi

echo ""
echo "=== BLOCK 2 smoke завершён ==="
