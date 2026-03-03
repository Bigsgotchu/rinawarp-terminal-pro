#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKER_DIR="$ROOT/stripe-webhook-worker"
DB_NAME="${DB_NAME:-rinawarp-prod}"
API_BASE="${API_BASE:-https://api.rinawarptech.com}"
PRICE_ID="${PRICE_ID:-price_1Sdxl7GZrRdZy3W9INQvidPf}" # Pro monthly (live)
EMAIL="${1:-}"
EXPECTED_TIER="${EXPECTED_TIER:-pro}"
TIMEOUT_SEC="${TIMEOUT_SEC:-900}"
POLL_SEC="${POLL_SEC:-15}"

if [[ -z "$EMAIL" ]]; then
  echo "Usage: $0 <customer_email>"
  echo "Example: $0 founder@yourdomain.com"
  exit 1
fi

if [[ -x "$WORKER_DIR/node_modules/.bin/wrangler" ]]; then
  WRANGLER_CMD=("$WORKER_DIR/node_modules/.bin/wrangler")
else
  WRANGLER_CMD=("npx" "wrangler")
fi

run_sql_json() {
  local sql="$1"
  (cd "$WORKER_DIR" && "${WRANGLER_CMD[@]}" d1 execute "$DB_NAME" --remote --command "$sql" --json)
}

first_number() {
  node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{const j=JSON.parse(d);const r=j?.[0]?.results?.[0]||{};const k=Object.keys(r)[0];process.stdout.write(String(r[k] ?? "0"));}catch{process.stdout.write("0");}})'
}

echo "== Live Purchase Check =="
echo "API          : $API_BASE"
echo "DB           : $DB_NAME"
echo "Email        : $EMAIL"
echo "Price ID     : $PRICE_ID"
echo "Expected tier: $EXPECTED_TIER"
echo

before_events="$(run_sql_json "SELECT COUNT(*) AS c FROM stripe_events;" | first_number)"
echo "Baseline stripe_events: $before_events"

checkout_json="$(curl -fsS "$API_BASE/api/stripe/checkout" \
  -H "content-type: application/json" \
  --data "{\"price_id\":\"$PRICE_ID\",\"customer_email\":\"$EMAIL\"}")"
checkout_url="$(printf "%s" "$checkout_json" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{const j=JSON.parse(d);process.stdout.write(j.url||"");}catch{process.stdout.write("");}})')"

if [[ -z "$checkout_url" ]]; then
  echo "❌ Failed to create live checkout session"
  echo "Response: $checkout_json"
  exit 1
fi

if [[ "$checkout_url" != *"cs_live_"* ]]; then
  echo "❌ Checkout URL is not live-mode: $checkout_url"
  exit 1
fi

echo "Checkout URL (complete payment in browser):"
echo "$checkout_url"
echo
echo "Polling every ${POLL_SEC}s for up to ${TIMEOUT_SEC}s..."

start_ts="$(date +%s)"
while true; do
  now_ts="$(date +%s)"
  elapsed="$((now_ts - start_ts))"

  events_now="$(run_sql_json "SELECT COUNT(*) AS c FROM stripe_events;" | first_number)"
  ent_json="$(run_sql_json "SELECT customer_id, tier, status, updated_at FROM entitlements WHERE lower(customer_email)=lower('$EMAIL') ORDER BY updated_at DESC LIMIT 1;")"
  ent_row="$(printf "%s" "$ent_json" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{const j=JSON.parse(d);const r=j?.[0]?.results?.[0]||null;process.stdout.write(JSON.stringify(r));}catch{process.stdout.write("null");}})')"

  echo "elapsed=${elapsed}s events=${events_now}"
  if [[ "$ent_row" != "null" ]]; then
    tier="$(printf "%s" "$ent_row" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{const j=JSON.parse(d||"{}");process.stdout.write(String(j.tier||""));})')"
    status="$(printf "%s" "$ent_row" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{const j=JSON.parse(d||"{}");process.stdout.write(String(j.status||""));})')"
    updated_at="$(printf "%s" "$ent_row" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{const j=JSON.parse(d||"{}");process.stdout.write(String(j.updated_at||"0"));})')"
    echo "entitlement: tier=$tier status=$status updated_at=$updated_at"
    if [[ "$status" == "active" ]] && [[ "$tier" == "$EXPECTED_TIER" || -z "$EXPECTED_TIER" ]]; then
      echo "✅ PASS: live purchase path verified"
      exit 0
    fi
  fi

  if (( elapsed >= TIMEOUT_SEC )); then
    echo "❌ Timeout waiting for entitlement update for $EMAIL"
    echo "   Checkout may not have been completed yet."
    exit 1
  fi
  sleep "$POLL_SEC"
done
