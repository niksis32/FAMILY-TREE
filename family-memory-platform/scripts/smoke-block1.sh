#!/usr/bin/env bash
# BLOCK 1 smoke — Collaboration & Family Communication
# Usage: export SMOKE_PASSWORD='...' && bash scripts/smoke-block1.sh

set -euo pipefail

API="${API:-http://localhost:4000/api/v1}"
EMAIL="${SMOKE_EMAIL:-admin@example.local}"
PASSWORD="${SMOKE_PASSWORD:-}"

json_pipe() {
  if command -v jq >/dev/null 2>&1; then jq .; else cat; fi
}

echo "=== BLOCK 1 smoke ==="
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
echo "[1/8] GET /conversations"
curl -sf -H "Authorization: Bearer $TOKEN" "$API/conversations" | json_pipe
echo "OK: conversations list"

echo ""
echo "[2/8] GET /notifications"
curl -sf -H "Authorization: Bearer $TOKEN" "$API/notifications" | json_pipe
echo "OK: notifications"

echo ""
echo "[3/8] GET /activity-feed"
curl -sf -H "Authorization: Bearer $TOKEN" "$API/activity-feed?limit=5" | json_pipe
echo "OK: activity feed"

echo ""
echo "[4/8] GET /calendar/events"
curl -sf -H "Authorization: Bearer $TOKEN" "$API/calendar/events" | json_pipe
echo "OK: calendar events"

echo ""
echo "[5/8] GET /calendar/export.ics (first lines)"
curl -sf -H "Authorization: Bearer $TOKEN" "$API/calendar/export.ics" | head -5
echo "OK: iCal export"

MEMBER_ID=""
if command -v jq >/dev/null 2>&1; then
  WORKSPACE_ID=$(curl -sf -H "Authorization: Bearer $TOKEN" "$API/workspaces/me" | jq -r '.[0].id // empty')
  MEMBER_ID=$(curl -sf -H "Authorization: Bearer $TOKEN" "$API/workspaces/$WORKSPACE_ID/members" 2>/dev/null | jq -r '.[1].userId // .[0].userId // empty' 2>/dev/null || true)
else
  WORKSPACE_ID=$(curl -sf -H "Authorization: Bearer $TOKEN" "$API/workspaces/me" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -1)
fi

USER_ID=$(echo "$LOGIN_JSON" | { command -v jq >/dev/null && jq -r '.user.id' || sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -1; })

echo ""
echo "[6/8] POST /conversations/group (self + optional member)"
PARTICIPANTS="[\"$USER_ID\"]"
if [[ -n "${MEMBER_ID:-}" && "$MEMBER_ID" != "$USER_ID" && "$MEMBER_ID" != "null" ]]; then
  PARTICIPANTS="[\"$USER_ID\",\"$MEMBER_ID\"]"
fi
GROUP_JSON=$(curl -sf -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Smoke group\",\"participantUserIds\":$PARTICIPANTS}" \
  "$API/conversations/group")
CONV_ID=$(echo "$GROUP_JSON" | { command -v jq >/dev/null && jq -r '.id' || sed -n 's/.*"id":"\([^"]*\)".*/\1/p' | head -1; })
echo "$GROUP_JSON" | json_pipe
echo "OK: group conversation id=$CONV_ID"

echo ""
echo "[7/8] POST /conversations/$CONV_ID/messages"
curl -sf -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"body":"Smoke test message from BLOCK 1"}' \
  "$API/conversations/$CONV_ID/messages" | json_pipe
echo "OK: message sent"

echo ""
echo "[8/8] POST /conversations/$CONV_ID/read"
curl -sf -X POST -H "Authorization: Bearer $TOKEN" \
  "$API/conversations/$CONV_ID/read" | json_pipe
echo "OK: mark read"

PERSON_ID=""
if command -v jq >/dev/null 2>&1; then
  PERSON_ID=$(curl -sf -H "Authorization: Bearer $TOKEN" "$API/persons" | jq -r '.[0].id // empty')
fi
if [[ -n "$PERSON_ID" && "$PERSON_ID" != "null" ]]; then
  echo ""
  echo "[bonus] POST /collaboration/persons/$PERSON_ID/lock"
  curl -sf -X POST -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{}' \
    "$API/collaboration/persons/$PERSON_ID/lock" | json_pipe
  echo "OK: person edit lock"
fi

echo ""
echo "=== BLOCK 1 smoke завершён ==="
