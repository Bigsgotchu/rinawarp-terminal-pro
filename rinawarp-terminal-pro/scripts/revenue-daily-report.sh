#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKER_DIR="$ROOT/stripe-webhook-worker"
DB_NAME="${DB_NAME:-rinawarp-prod}"
HOURS="${HOURS:-24}"
OUT_DIR="${OUT_DIR:-$ROOT/data/monitor}"
if [[ -x "$WORKER_DIR/node_modules/.bin/wrangler" ]]; then
  WRANGLER_CMD=("$WORKER_DIR/node_modules/.bin/wrangler")
else
  WRANGLER_CMD=("npx" "wrangler")
fi

mkdir -p "$OUT_DIR"
STAMP="$(date -u +"%Y%m%dT%H%M%SZ")"
OUT_FILE="$OUT_DIR/revenue-report-$STAMP.md"

WINDOW_MS="$((HOURS * 60 * 60 * 1000))"
NOW_MS="$(($(date +%s) * 1000))"
SINCE_MS="$((NOW_MS - WINDOW_MS))"

run_sql() {
  local sql="$1"
  local out
  if out="$(cd "$WORKER_DIR" && "${WRANGLER_CMD[@]}" d1 execute "$DB_NAME" --remote --command "$sql" --json 2>&1)"; then
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

{
  echo "# Revenue Daily Report"
  echo
  echo "- Generated (UTC): $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "- DB: \`$DB_NAME\`"
  echo "- Window: last \`$HOURS\` hours"
  echo
  echo "## Funnel KPIs"
  echo
  echo '```'
  run_sql "WITH p AS (SELECT COUNT(*) AS pricing_views FROM funnel_events WHERE event='page_view' AND path IN ('/pricing','/pricing/') AND created_at >= $SINCE_MS), c AS (SELECT COUNT(*) AS checkout_clicks FROM funnel_events WHERE event='pricing_checkout_click' AND created_at >= $SINCE_MS), s AS (SELECT COUNT(*) AS signup_successes FROM funnel_events WHERE event='signup_success' AND created_at >= $SINCE_MS), l AS (SELECT COUNT(*) AS login_successes FROM funnel_events WHERE event='login_success' AND created_at >= $SINCE_MS) SELECT p.pricing_views, c.checkout_clicks, s.signup_successes, l.login_successes, CASE WHEN p.pricing_views > 0 THEN ROUND(100.0 * c.checkout_clicks / p.pricing_views, 2) ELSE 0 END AS pricing_to_checkout_pct FROM p, c, s, l;"
  echo '```'
  echo
  echo "## Top Events (Volume)"
  echo
  echo '```'
  run_sql "SELECT event, COUNT(*) AS cnt FROM funnel_events WHERE created_at >= $SINCE_MS GROUP BY event ORDER BY cnt DESC LIMIT 25;"
  echo '```'
  echo
  echo "## Recent Stripe/Webhook Activity"
  echo
  echo '```'
  run_sql "SELECT COUNT(*) AS webhook_events_last_${HOURS}h FROM stripe_events WHERE received_at >= $SINCE_MS;"
  echo '```'
  echo
  echo "## Recent Entitlement Updates"
  echo
  echo '```'
  run_sql "SELECT COUNT(*) AS entitlement_updates_last_${HOURS}h FROM entitlements WHERE updated_at >= $SINCE_MS;"
  echo
  run_sql "SELECT customer_id, tier, status, customer_email, subscription_id, updated_at FROM entitlements ORDER BY updated_at DESC LIMIT 20;"
  echo '```'
  echo
  echo "## Notes"
  echo
  echo "- \`pricing_to_checkout_pct\` below 2% usually indicates a pricing page/offer problem."
  echo "- High \`checkout_clicks\` with low entitlement updates points to Stripe checkout/webhook failures."
  echo "- Zero funnel rows means frontend tracking is not reaching \`/api/events\`."
} > "$OUT_FILE"

echo "✅ Wrote revenue report: $OUT_FILE"
