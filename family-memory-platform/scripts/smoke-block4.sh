#!/usr/bin/env bash
# BLOCK 4 smoke — Experience & Retention (PWA hooks, onboarding, quests, story locales)
# Usage: export SMOKE_PASSWORD='...' && bash scripts/smoke-block4.sh

set -euo pipefail

API="${API:-http://localhost:4000/api/v1}"
WEB="${WEB:-http://localhost:3000}"
EMAIL="${SMOKE_EMAIL:-admin@example.local}"
PASSWORD="${SMOKE_PASSWORD:-}"

json_pipe() {
  if command -v jq >/dev/null 2>&1; then jq .; else cat; fi
}

echo "=== BLOCK 4 smoke ==="
echo "API: $API"
echo "WEB: $WEB"

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

WORKSPACE_ID="${SMOKE_WORKSPACE_ID:-seed-workspace-default}"
WS_JSON=$(curl -sf -H "Authorization: Bearer $TOKEN" "$API/workspaces/me")
if ! echo "$WS_JSON" | grep -q "\"id\":\"$WORKSPACE_ID\""; then
  WORKSPACE_ID=$(echo "$WS_JSON" | { command -v jq >/dev/null && jq -r '.[0].id' || sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -1; })
fi
HDR=(-H "Authorization: Bearer $TOKEN" -H "X-Workspace-Id: $WORKSPACE_ID")

echo ""
echo "[1/6] GET /onboarding/progress"
ONBOARD_JSON=$(curl -sf "${HDR[@]}" "$API/onboarding/progress")
echo "$ONBOARD_JSON" | json_pipe
echo "OK: onboarding progress"

echo ""
echo "[2/6] PATCH /onboarding/progress (complete welcome)"
curl -sf -X PATCH "${HDR[@]}" -H "Content-Type: application/json" \
  -d '{"completeStep":true}' "$API/onboarding/progress" | json_pipe
echo "OK: onboarding step advanced"

echo ""
echo "[3/6] GET $WEB/manifest.webmanifest"
MANIFEST_NAME=$(curl -sf "$WEB/manifest.webmanifest" | { command -v jq >/dev/null && jq -r '.name' || sed -n 's/.*"name":"\([^"]*\)".*/\1/p'; })
if [[ -z "$MANIFEST_NAME" || "$MANIFEST_NAME" == "null" ]]; then
  echo "FAIL: manifest name empty"
  exit 1
fi
echo "OK: manifest name = $MANIFEST_NAME"

echo ""
echo "[4/6] GET /gamification/leaderboard/opt-in"
curl -sf "${HDR[@]}" "$API/gamification/leaderboard/opt-in" | json_pipe
echo "OK: quest leaderboard opt-in"

echo ""
echo "[5/6] PATCH /gamification/leaderboard/opt-in"
curl -sf -X PATCH "${HDR[@]}" -H "Content-Type: application/json" \
  -d '{"optedIn":true,"displayName":"Smoke Tester"}' "$API/gamification/leaderboard/opt-in" | json_pipe
echo "OK: leaderboard opt-in set"

STORY_ID=""
if command -v jq >/dev/null 2>&1; then
  STORY_ID=$(curl -sf "${HDR[@]}" "$API/family-stories" | jq -r '.[0].id // empty')
fi

echo ""
echo "[6/6] GET /stories/:id/locales"
if [[ -n "$STORY_ID" && "$STORY_ID" != "null" ]]; then
  curl -sf "${HDR[@]}" "$API/stories/$STORY_ID/locales" | json_pipe
  echo "OK: story locales for $STORY_ID"

  echo ""
  echo "[bonus] POST /stories/:id/locales/translate"
  curl -sf -X POST "${HDR[@]}" -H "Content-Type: application/json" \
    -d '{"targetLocale":"en"}' "$API/stories/$STORY_ID/locales/translate" | json_pipe
  echo "OK: story translation job"
else
  echo "SKIP: no family story in workspace — create one in UI for full locale smoke"
fi

echo ""
echo "[bonus] POST /push/subscribe (stub)"
curl -sf -X POST "${HDR[@]}" -H "Content-Type: application/json" \
  -d '{"endpoint":"https://example.com/push/stub"}' "$API/push/subscribe" | json_pipe
echo "OK: push subscribe stub"

echo ""
echo "=== BLOCK 4 smoke PASS ==="
