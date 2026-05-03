#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-https://www.rinawarptech.com}"
API="${API:-https://api.rinawarptech.com}"
PAGES="${PAGES:-https://rinawarptech-website.pages.dev}"
DOWNLOADS="${DOWNLOADS:-https://rinawarp-downloads.rinawarptech.workers.dev}"
VERIFY_URL="${VERIFY_URL:-https://rinawarptech.com/download/checksums}"
TEST_CUSTOMER_ID="${TEST_CUSTOMER_ID:-cus_TEST}"
INTERVAL_SEC="${INTERVAL_SEC:-300}"
MAX_CONSEC_FAILS="${MAX_CONSEC_FAILS:-3}"
ONCE="${ONCE:-0}"
ALERT_WEBHOOK_URL="${ALERT_WEBHOOK_URL:-}"
FORCE_IPV4="${FORCE_IPV4:-1}"
RETRY_PROFILE="${RETRY_PROFILE:-default}"
RESOLVE_WWW_IP="${RESOLVE_WWW_IP:-}"
RESOLVE_API_IP="${RESOLVE_API_IP:-}"
RESOLVE_PAGES_IP="${RESOLVE_PAGES_IP:-}"
RESOLVE_DOWNLOADS_IP="${RESOLVE_DOWNLOADS_IP:-}"
LOG_DIR="${LOG_DIR:-data/monitor}"
LOG_FILE="${LOG_FILE:-$LOG_DIR/prod-watchdog.log}"
STATE_FILE="${STATE_FILE:-$LOG_DIR/prod-watchdog.state}"

mkdir -p "$LOG_DIR"
touch "$LOG_FILE"

log() {
  local level="$1"
  shift
  local ts
  ts="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  printf "[%s] [%s] %s\n" "$ts" "$level" "$*" | tee -a "$LOG_FILE"
}

post_alert() {
  local status="$1"
  local body="$2"
  [[ -n "$ALERT_WEBHOOK_URL" ]] || return 0
  curl -sS --connect-timeout 10 --max-time 20 --retry 2 --retry-all-errors \
    -X POST "$ALERT_WEBHOOK_URL" \
    -H "content-type: application/json" \
    -d "{\"status\":\"$status\",\"service\":\"rinawarp-prod-watchdog\",\"message\":$(printf '%s' "$body" | node -e 'let d=\"\";process.stdin.on(\"data\",c=>d+=c);process.stdin.on(\"end\",()=>process.stdout.write(JSON.stringify(d)))')}" \
    >/dev/null || true
}

run_step() {
  local name="$1"
  shift
  local out
  if out="$("$@" 2>&1)"; then
    log "OK" "$name passed"
    printf "%s\n" "$out" >> "$LOG_FILE"
    return 0
  fi
  log "ERR" "$name failed"
  printf "%s\n" "$out" >> "$LOG_FILE"
  return 1
}

fail_count=0
if [[ -f "$STATE_FILE" ]]; then
  fail_count="$(cat "$STATE_FILE" 2>/dev/null || echo 0)"
fi

log "INFO" "watchdog started BASE=$BASE API=$API DOWNLOADS=$DOWNLOADS interval=${INTERVAL_SEC}s max_fails=$MAX_CONSEC_FAILS once=$ONCE force_ipv4=$FORCE_IPV4 retry=$RETRY_PROFILE"

while true; do
  cycle_ok=1
  log "INFO" "cycle begin"

  run_step "smoke-prod" env \
    FORCE_IPV4="$FORCE_IPV4" \
    RETRY_PROFILE="$RETRY_PROFILE" \
    CURL_RESOLVE_BASE_IP="$RESOLVE_WWW_IP" \
    CURL_RESOLVE_API_IP="$RESOLVE_API_IP" \
    bash scripts/smoke-prod.sh "$BASE" "$API" || cycle_ok=0

  run_step "audit-site" env \
    FORCE_IPV4="$FORCE_IPV4" \
    RETRY_PROFILE="$RETRY_PROFILE" \
    CURL_RESOLVE_BASE_IP="$RESOLVE_WWW_IP" \
    CURL_RESOLVE_PAGES_IP="$RESOLVE_PAGES_IP" \
    CURL_RESOLVE_DL_IP="$RESOLVE_DOWNLOADS_IP" \
    bash scripts/audit-site.sh "$BASE" "$PAGES" "$VERIFY_URL" || cycle_ok=0

  run_step "e2e-revenue-smoke" env \
    TEST_CUSTOMER_ID="$TEST_CUSTOMER_ID" \
    FORCE_IPV4="$FORCE_IPV4" \
    RETRY_PROFILE="$RETRY_PROFILE" \
    CURL_RESOLVE_BASE_IP="$RESOLVE_WWW_IP" \
    CURL_RESOLVE_API_IP="$RESOLVE_API_IP" \
    CURL_RESOLVE_DOWNLOADS_IP="$RESOLVE_DOWNLOADS_IP" \
    bash scripts/e2e-revenue-smoke.sh "$BASE" "$API" "$DOWNLOADS" || cycle_ok=0

  if [[ "$cycle_ok" == "1" ]]; then
    fail_count=0
    printf "%s" "$fail_count" > "$STATE_FILE"
    log "OK" "cycle passed"
    post_alert "ok" "Production watchdog cycle passed"
  else
    fail_count=$((fail_count + 1))
    printf "%s" "$fail_count" > "$STATE_FILE"
    log "ERR" "cycle failed consecutive_failures=$fail_count"
    if (( fail_count >= MAX_CONSEC_FAILS )); then
      post_alert "critical" "Production watchdog failed $fail_count consecutive cycles"
    else
      post_alert "warn" "Production watchdog failed cycle (consecutive=$fail_count)"
    fi
  fi

  if [[ "$ONCE" == "1" ]]; then
    if [[ "$cycle_ok" == "1" ]]; then
      exit 0
    fi
    exit 1
  fi

  sleep "$INTERVAL_SEC"
done
