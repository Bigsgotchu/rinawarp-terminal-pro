#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKER_DIR="$ROOT/stripe-webhook-worker"
DB_NAME="${DB_NAME:-rinawarp-prod}"
API_BASE="${API_BASE:-https://api.rinawarptech.com}"
HOURS="${HOURS:-24}"
if [[ -x "$WORKER_DIR/node_modules/.bin/wrangler" ]]; then
  WRANGLER_CMD=("$WORKER_DIR/node_modules/.bin/wrangler")
else
  WRANGLER_CMD=("npx" "wrangler")
fi

WINDOW_MS="$((HOURS * 60 * 60 * 1000))"
NOW_MS="$(($(date +%s) * 1000))"
SINCE_MS="$((NOW_MS - WINDOW_MS))"

run_sql() {
  local sql="$1"
  local out
  if out="$("${WRANGLER_CMD[@]}" d1 execute "$DB_NAME" --remote --command "$sql" --json 2>&1)"; then
    printf "%s\n" "$out"
    return 0
  fi
  printf "%s\n" "$out"
  echo
  echo "ERROR: D1 query failed. Check Wrangler auth/account context."
  echo "Run: npx wrangler whoami"
  echo "Then: npx wrangler login"
  return 1
}

echo "== Stripe Success Audit =="
echo "DB         : $DB_NAME"
echo "API        : $API_BASE"
echo "Window     : last $HOURS hours"
echo

echo "== API endpoint checks =="
webhook_get="$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/api/stripe/webhook" || echo "000")"
checkout_options="$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "$API_BASE/api/stripe/checkout" -H "Origin: https://www.rinawarptech.com" -H "Access-Control-Request-Method: POST" || echo "000")"
echo "GET /api/stripe/webhook -> $webhook_get (expected 405)"
echo "OPTIONS /api/stripe/checkout -> $checkout_options (expected 200/204)"
echo

echo "== D1 recent webhook volume =="
cd "$WORKER_DIR"
run_sql \
"SELECT COUNT(*) AS webhook_events_last_${HOURS}h FROM stripe_events WHERE received_at >= $SINCE_MS;"
echo

echo "== D1 recent entitlement updates =="
run_sql \
"SELECT COUNT(*) AS entitlement_updates_last_${HOURS}h FROM entitlements WHERE updated_at >= $SINCE_MS;"
echo

echo "== D1 most recent entitlements =="
run_sql \
"SELECT customer_id, tier, status, customer_email, subscription_id, updated_at FROM entitlements ORDER BY updated_at DESC LIMIT 20;"
echo

echo "✅ Stripe success audit complete"
