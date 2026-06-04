#!/usr/bin/env bash
# PROMPT PROD 1 — runtime smoke (bash/WSL)
# Usage: API must be up — pnpm api:build && pnpm api:start
set -uo pipefail

API="${API_BASE:-http://127.0.0.1:4000/api/v1}"
EMAIL="${SMOKE_EMAIL:-admin@example.local}"
PASS="${SMOKE_PASSWORD:-Test12345!}"

pass=0
fail=0
partial=0

ok() { echo "PASS  $1"; pass=$((pass + 1)); }
bad() { echo "FAIL  $1 — $2"; fail=$((fail + 1)); }
warn() { echo "PARTIAL  $1 — $2"; partial=$((partial + 1)); }

echo "=== Production gates runtime smoke ==="
echo "API: $API"

TOKEN=$(curl -sf -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" | jq -r .accessToken) || true

if [[ -z "${TOKEN:-}" || "$TOKEN" == "null" ]]; then
  bad "login" "no token"
  echo "Summary: PASS=$pass PARTIAL=$partial FAIL=$fail"
  exit 1
fi
ok "login"

AUTH=(-H "Authorization: Bearer $TOKEN")

# CRUD person
if curl -sf "${AUTH[@]}" "$API/persons?limit=1" >/dev/null; then ok "persons list"; else bad "persons list" "request failed"; fi

CREATED=$(curl -sf -X POST "${AUTH[@]}" "$API/persons" \
  -H 'Content-Type: application/json' \
  -d '{"givenName":"Smoke","familyName":"Test","gender":"UNKNOWN","privacyLevel":"FAMILY"}') || true
PID=$(echo "$CREATED" | jq -r .id)
if [[ -n "$PID" && "$PID" != "null" ]]; then
  ok "person create"
  curl -sf -X DELETE "${AUTH[@]}" "$API/persons/$PID" >/dev/null && ok "person delete" || bad "person delete" "DELETE failed"
else
  bad "person create" "no id"
fi

# Tree
FIRST=$(curl -sf "${AUTH[@]}" "$API/persons?limit=1" | jq -r '.[0].id // empty')
if [[ -n "$FIRST" ]]; then
  TREE=$(curl -sf "${AUTH[@]}" "$API/tree/person/$FIRST/view-data") || true
  if echo "$TREE" | jq -e '.nodes' >/dev/null 2>&1; then ok "tree view-data"; else warn "tree view-data" "empty nodes"; fi
else
  warn "tree view-data" "no persons"
fi

# MinIO upload URLs
MEDIA=$(curl -sf -X POST "${AUTH[@]}" "$API/media/upload-url" \
  -H 'Content-Type: application/json' \
  -d '{"fileName":"smoke.jpg","mimeType":"image/jpeg","sizeBytes":1024}') || true
if echo "$MEDIA" | jq -e '.uploadUrl' >/dev/null 2>&1; then ok "media upload-url"; else bad "media upload-url" "no uploadUrl"; fi

DOC=$(curl -sf -X POST "${AUTH[@]}" "$API/documents/upload-url" \
  -H 'Content-Type: application/json' \
  -d '{"fileName":"smoke.pdf","mimeType":"application/pdf","sizeBytes":2048}') || true
if echo "$DOC" | jq -e '.uploadUrl' >/dev/null 2>&1; then ok "document upload-url"; else bad "document upload-url" "no uploadUrl"; fi

# Search
curl -sf -X POST "${AUTH[@]}" "$API/search/reindex" >/dev/null || true
sleep 2
HITS=$(curl -sf "${AUTH[@]}" "$API/search?q=Timeline" | jq '[.people,.documents,.events] | add | length')
if [[ "${HITS:-0}" -gt 0 ]]; then ok "search hits ($HITS)"; else warn "search hits" "0 after reindex"; fi

# GEDCOM preview
GP=$(curl -sf -X POST "${AUTH[@]}" "$API/gedcom/preview" \
  -H 'Content-Type: application/json' \
  -d '{"gedcomText":"0 HEAD\n0 @I1@ INDI\n1 NAME Smoke /Gedcom/\n0 TRLR"}') || true
PF=$(echo "$GP" | jq -r '.preview.personsFound // .personsFound // 0')
if [[ "$PF" -ge 1 ]]; then ok "GEDCOM preview"; else warn "GEDCOM preview" "personsFound=$PF"; fi

# Timeline
if [[ -n "$FIRST" ]]; then
  TL=$(curl -sf "${AUTH[@]}" "$API/timeline/person/$FIRST") || true
  if echo "$TL" | jq -e '.events' >/dev/null 2>&1; then ok "timeline"; else warn "timeline" "no events"; fi
else
  warn "timeline" "no persons"
fi

# Privacy + AI consent (PRIVACY-ENFORCE-1)
CENTER=$(curl -sf "${AUTH[@]}" "$API/privacy/security-center") || true
AI_GRANTED=$(echo "$CENTER" | jq -r '.consents[] | select(.consentKey=="AI_LOCAL_PROCESSING") | .granted // false')
if [[ "$AI_GRANTED" == "true" ]]; then
  ok "privacy ai consent (seed/admin)"
else
  curl -sf -X PATCH "${AUTH[@]}" "$API/privacy/consents" \
    -H 'Content-Type: application/json' \
    -d '{"consentKey":"AI_LOCAL_PROCESSING","granted":true}' >/dev/null && ok "privacy ai consent (granted via API)" || bad "privacy ai consent" "PATCH failed"
fi

ADMIN_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${AUTH[@]}" "$API/persons/seed-person-secret")
if [[ "$ADMIN_CODE" == "200" ]]; then ok "privacy admin sees PRIVATE person"; else bad "privacy admin PRIVATE person" "expected 200, got $ADMIN_CODE"; fi

VIEWER_TOKEN=$(curl -sf -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"viewer@example.local\",\"password\":\"$PASS\"}" | jq -r .accessToken) || true
if [[ -n "${VIEWER_TOKEN:-}" && "$VIEWER_TOKEN" != "null" ]]; then
  VIEWER_AUTH=(-H "Authorization: Bearer $VIEWER_TOKEN")
  VIEWER_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${VIEWER_AUTH[@]}" "$API/persons/seed-person-secret")
  if [[ "$VIEWER_CODE" == "404" ]]; then ok "privacy viewer blocked PRIVATE person (404)"; else bad "privacy viewer PRIVATE person" "expected 404, got $VIEWER_CODE"; fi
else
  bad "privacy viewer login" "no token — run db:seed for viewer@example.local"
fi

curl -sf -X PATCH "${AUTH[@]}" "$API/privacy/consents" \
  -H 'Content-Type: application/json' \
  -d '{"consentKey":"AI_LOCAL_PROCESSING","granted":false}' >/dev/null || true
BLOCKED_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${AUTH[@]}" "$API/ai/ocr/preview" \
  -H 'Content-Type: application/json' \
  -d '{}')
curl -sf -X PATCH "${AUTH[@]}" "$API/privacy/consents" \
  -H 'Content-Type: application/json' \
  -d '{"consentKey":"AI_LOCAL_PROCESSING","granted":true}' >/dev/null || true
if [[ "$BLOCKED_CODE" == "403" ]]; then ok "privacy ai consent gate (403 without consent)"; else bad "privacy ai consent gate" "expected 403, got $BLOCKED_CODE"; fi

SHARE=$(curl -sf -X POST "${AUTH[@]}" "$API/privacy/public-shares" \
  -H 'Content-Type: application/json' \
  -d '{"workspaceId":"seed-workspace-default","resourceType":"PERSON","resourceId":"seed-person-ivan","label":"smoke-share","expiresAt":"2099-01-01T00:00:00.000Z"}') || true
SHARE_TOKEN=$(echo "$SHARE" | jq -r .token)
SHARE_ID=$(echo "$SHARE" | jq -r .id)
if [[ -n "$SHARE_TOKEN" && "$SHARE_TOKEN" != "null" ]]; then
  curl -sf "$API/public/share/$SHARE_TOKEN" >/dev/null && ok "privacy public link resolve" || bad "privacy public link resolve" "GET failed"
  curl -sf -X POST "${AUTH[@]}" "$API/privacy/public-shares/$SHARE_ID/revoke" >/dev/null || true
  REVOKED_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/public/share/$SHARE_TOKEN")
  if [[ "$REVOKED_CODE" -ge 400 ]]; then ok "privacy public link revoke"; else bad "privacy public link revoke" "expected error, got $REVOKED_CODE"; fi
else
  bad "privacy public link" "no token in create response"
fi

echo ""
echo "Summary: PASS=$pass PARTIAL=$partial FAIL=$fail"
[[ "$fail" -eq 0 ]]
