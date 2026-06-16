#!/usr/bin/env bash
# BLOCK 5 smoke — Integrations, Enterprise & Long-tail Value
# Usage: export SMOKE_PASSWORD='...' && bash scripts/smoke-block5.sh

set -euo pipefail

API="${API:-http://localhost:4000/api/v1}"
EMAIL="${SMOKE_EMAIL:-admin@example.local}"
PASSWORD="${SMOKE_PASSWORD:-}"

json_pipe() {
  if command -v jq >/dev/null 2>&1; then jq .; else cat; fi
}

echo "=== BLOCK 5 smoke ==="
echo "API: $API"

if [[ -z "$PASSWORD" ]]; then
  echo "SKIP: задайте SMOKE_PASSWORD для JWT smoke"
  exit 0
fi

echo ""
echo "[login] POST /auth/login"
LOGIN_JSON=$(curl -sf -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

if echo "$LOGIN_JSON" | grep -q '"mfaRequired"'; then
  echo "MFA включён — отключите TOTP для smoke"
  exit 1
fi

TOKEN=$(echo "$LOGIN_JSON" | { command -v jq >/dev/null && jq -r '.accessToken' || sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p'; })
echo "OK: JWT получен"

echo ""
echo "[1/12] GET /webhooks/endpoints"
curl -sf -H "Authorization: Bearer $TOKEN" "$API/webhooks/endpoints" | json_pipe
echo "OK: webhooks endpoints"

echo ""
echo "[2/12] GET /external-archives/providers"
curl -sf -H "Authorization: Bearer $TOKEN" "$API/external-archives/providers" | json_pipe
echo "OK: archive providers"

echo ""
echo "[3/12] POST /external-archives/search"
SEARCH_JSON=$(curl -sf -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"provider":"FAMILYSEARCH","familyName":"Petrov","givenName":"Ivan"}' \
  "$API/external-archives/search")
echo "$SEARCH_JSON" | json_pipe
SEARCH_ID=$(echo "$SEARCH_JSON" | { command -v jq >/dev/null && jq -r '.searchId // .id' || sed -n 's/.*"searchId":"\([^"]*\)".*/\1/p' | head -1; })
echo "OK: archive search id=$SEARCH_ID"

if [[ -n "${SEARCH_ID:-}" && "$SEARCH_ID" != "null" ]]; then
  echo ""
  echo "[4/12] GET /external-archives/searches/$SEARCH_ID"
  sleep 1
  curl -sf -H "Authorization: Bearer $TOKEN" "$API/external-archives/searches/$SEARCH_ID" | json_pipe
  echo "OK: archive search poll"
fi

echo ""
echo "[5/12] GET /branding"
curl -sf -H "Authorization: Bearer $TOKEN" "$API/branding" | json_pipe
echo "OK: branding"

echo ""
echo "[6/12] GET /export/templates"
curl -sf -H "Authorization: Bearer $TOKEN" "$API/export/templates" | json_pipe
echo "OK: export templates"

echo ""
echo "[7/12] GET /dna/profile"
HTTP_CODE=$(curl -s -o /tmp/dna_profile.json -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$API/dna/profile")
cat /tmp/dna_profile.json | json_pipe
echo "OK: dna profile (HTTP $HTTP_CODE)"

echo ""
echo "[8/12] GET /cemetery/cemeteries"
curl -sf -H "Authorization: Bearer $TOKEN" "$API/cemetery/cemeteries" | json_pipe
echo "OK: cemeteries list"

echo ""
echo "[9/12] GET /cemetery/map"
curl -sf -H "Authorization: Bearer $TOKEN" "$API/cemetery/map" | json_pipe
echo "OK: cemetery map"

echo ""
echo "[10/12] POST /cemetery/cemeteries"
CEM_JSON=$(curl -sf -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Smoke Memorial Park","latitude":55.75,"longitude":37.62}' \
  "$API/cemetery/cemeteries")
echo "$CEM_JSON" | json_pipe
CEM_ID=$(echo "$CEM_JSON" | { command -v jq >/dev/null && jq -r '.id' || sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -1; })
echo "OK: cemetery id=$CEM_ID"

PERSON_ID=""
if command -v jq >/dev/null 2>&1; then
  PERSON_ID=$(curl -sf -H "Authorization: Bearer $TOKEN" "$API/persons" | jq -r '.[] | select(.isLiving == false or .deathDate != null) | .id' 2>/dev/null | head -1)
  if [[ -z "$PERSON_ID" || "$PERSON_ID" == "null" ]]; then
    PERSON_ID=$(curl -sf -H "Authorization: Bearer $TOKEN" "$API/persons" | jq -r '.[0].id // empty')
  fi
fi

if [[ -n "${CEM_ID:-}" && "$CEM_ID" != "null" && -n "${PERSON_ID:-}" && "$PERSON_ID" != "null" ]]; then
  echo ""
  echo "[11/12] POST /cemetery/burial-sites"
  BURIAL_JSON=$(curl -sf -X POST -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"cemeteryId\":\"$CEM_ID\",\"personId\":\"$PERSON_ID\",\"plotLabel\":\"A-12\",\"latitude\":55.751,\"longitude\":37.621}" \
    "$API/cemetery/burial-sites")
  echo "$BURIAL_JSON" | json_pipe
  BURIAL_ID=$(echo "$BURIAL_JSON" | { command -v jq >/dev/null && jq -r '.id' || sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -1; })
  echo "OK: burial site id=$BURIAL_ID"

  if [[ -n "${BURIAL_ID:-}" && "$BURIAL_ID" != "null" ]]; then
    echo ""
    echo "[12/12] POST /cemetery/routes/plan"
    curl -sf -X POST -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"burialSiteIds\":[\"$BURIAL_ID\"]}" \
      "$API/cemetery/routes/plan" | json_pipe
    echo "OK: route plan"
  fi
else
  echo ""
  echo "[11-12] SKIP burial/route — need cemetery + deceased person"
fi

echo ""
echo "=== BLOCK 5 smoke завершён ==="
