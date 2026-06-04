#!/usr/bin/env bash
# MVP §8 DoD — automated checks (run from repo root in WSL Ubuntu)
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

LOG_DIR="$ROOT/docs/dod-verify-logs"
mkdir -p "$LOG_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
SUMMARY="$LOG_DIR/summary-$STAMP.txt"

pass() { echo "PASS  $1" | tee -a "$SUMMARY"; }
fail() { echo "FAIL  $1" | tee -a "$SUMMARY"; }
partial() { echo "PARTIAL  $1" | tee -a "$SUMMARY"; }
skip() { echo "SKIP  $1" | tee -a "$SUMMARY"; }

run_step() {
  local id="$1"
  local name="$2"
  shift 2
  local log="$LOG_DIR/${STAMP}-${id}.log"
  echo ""
  echo "======== [$id] $name ========"
  if "$@" >"$log" 2>&1; then
    pass "[$id] $name"
    tail -n 5 "$log"
    return 0
  fi
  local code=$?
  fail "[$id] $name (exit $code) — see $log"
  tail -n 20 "$log"
  return "$code"
}

echo "DoD verification: $(date -Iseconds)" | tee "$SUMMARY"
echo "Root: $ROOT" | tee -a "$SUMMARY"
echo "node: $(node -v)" | tee -a "$SUMMARY"
echo "pnpm: $(pnpm -v)" | tee -a "$SUMMARY"

run_step "01" "pnpm install --frozen-lockfile" pnpm install --frozen-lockfile || partial "[01]"
run_step "02" "pnpm db:generate" pnpm db:generate || partial "[02]"
run_step "03" "pnpm db:migrate deploy" pnpm --filter @family/api exec prisma migrate deploy || partial "[03]"
run_step "04a" "turbo build deps" pnpm exec turbo run build --filter=@family/web^... || partial "[04a]"
run_step "04b" "turbo build web" pnpm exec turbo run build --filter=@family/web || partial "[04b]"
run_step "05" "pnpm lint" pnpm lint || fail "[05]"
run_step "06" "pnpm test" pnpm test || partial "[06]"

if command -v docker >/dev/null 2>&1; then
  run_step "08" "compose dev config" docker compose -f docker-compose.yml -f docker-compose.dev.yml config --quiet
  run_step "09" "compose prod config" docker compose -f docker-compose.yml -f docker-compose.prod.yml config --quiet
  docker ps --format 'table {{.Names}}\t{{.Status}}' | tee "$LOG_DIR/${STAMP}-docker-ps.txt" || true
else
  skip "[08-09] docker not in PATH"
fi

API_URL="${API_URL:-http://127.0.0.1:4002/api/v1}"
if curl -sf "${API_URL}/docs" >/dev/null 2>&1; then
  pass "[API] $API_URL/docs"
else
  skip "[API] not up — see MVP_DOD_WSL_RUNBOOK.md §9 smoke"
fi

echo ""
echo "Summary: $SUMMARY"
