#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKER_DIR="$ROOT/stripe-webhook-worker"
DB_NAME="${DB_NAME:-rinawarp-prod}"
HOURS="${HOURS:-24}"

if [[ -x "$WORKER_DIR/node_modules/.bin/wrangler" ]]; then
  WRANGLER_CMD=("$WORKER_DIR/node_modules/.bin/wrangler")
else
  WRANGLER_CMD=("npx" "wrangler")
fi

NOW_MS="$(($(date +%s) * 1000))"
SINCE_MS="$((NOW_MS - HOURS * 60 * 60 * 1000))"

SQL="
WITH
  p AS (SELECT COUNT(*) AS pricing_views FROM funnel_events WHERE event='page_view' AND path IN ('/pricing','/pricing/') AND created_at >= $SINCE_MS),
  c AS (SELECT COUNT(*) AS checkout_clicks FROM funnel_events WHERE event='pricing_checkout_click' AND created_at >= $SINCE_MS),
  r AS (SELECT COUNT(*) AS checkout_redirects FROM funnel_events WHERE event='pricing_checkout_redirect' AND created_at >= $SINCE_MS),
  s AS (SELECT COUNT(*) AS signup_successes FROM funnel_events WHERE event='signup_success' AND created_at >= $SINCE_MS),
  l AS (SELECT COUNT(*) AS login_successes FROM funnel_events WHERE event='login_success' AND created_at >= $SINCE_MS),
  w AS (SELECT COUNT(*) AS webhook_events FROM stripe_events WHERE received_at >= $SINCE_MS),
  e AS (SELECT COUNT(*) AS entitlement_updates FROM entitlements WHERE updated_at >= $SINCE_MS)
SELECT
  p.pricing_views,
  c.checkout_clicks,
  r.checkout_redirects,
  s.signup_successes,
  l.login_successes,
  w.webhook_events,
  e.entitlement_updates
FROM p,c,r,s,l,w,e;
"

raw="$(cd "$WORKER_DIR" && "${WRANGLER_CMD[@]}" d1 execute "$DB_NAME" --remote --command "$SQL" --json)"
row="$(printf "%s" "$raw" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{const j=JSON.parse(d);const r=(j[0]&&j[0].results&&j[0].results[0])||{};process.stdout.write(JSON.stringify(r));})')"

pricing_views="$(printf "%s" "$row" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{const j=JSON.parse(d||"{}");process.stdout.write(String(j.pricing_views||0));})')"
checkout_clicks="$(printf "%s" "$row" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{const j=JSON.parse(d||"{}");process.stdout.write(String(j.checkout_clicks||0));})')"
checkout_redirects="$(printf "%s" "$row" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{const j=JSON.parse(d||"{}");process.stdout.write(String(j.checkout_redirects||0));})')"
webhook_events="$(printf "%s" "$row" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{const j=JSON.parse(d||"{}");process.stdout.write(String(j.webhook_events||0));})')"
entitlement_updates="$(printf "%s" "$row" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{const j=JSON.parse(d||"{}");process.stdout.write(String(j.entitlement_updates||0));})')"

echo "== Revenue Diagnosis (last ${HOURS}h) =="
echo "pricing_views       : $pricing_views"
echo "checkout_clicks     : $checkout_clicks"
echo "checkout_redirects  : $checkout_redirects"
echo "webhook_events      : $webhook_events"
echo "entitlement_updates : $entitlement_updates"
echo

if (( pricing_views == 0 )); then
  echo "PRIMARY BOTTLENECK: No qualified pricing traffic."
  echo "TODAY ACTION: Drive targeted visits to /pricing (content posts + direct outreach + demo clip)."
  exit 0
fi

if (( checkout_clicks == 0 )); then
  echo "PRIMARY BOTTLENECK: Offer/pricing page conversion (views but no checkout intent)."
  echo "TODAY ACTION: Change pricing hero/CTA/proof block and re-measure in 24h."
  exit 0
fi

if (( checkout_redirects == 0 )); then
  echo "PRIMARY BOTTLENECK: Checkout session creation failure."
  echo "TODAY ACTION: Inspect /api/stripe/checkout logs and price_id mappings."
  exit 0
fi

if (( webhook_events == 0 )); then
  echo "PRIMARY BOTTLENECK: Stripe webhook delivery/handling."
  echo "TODAY ACTION: Verify Stripe webhook endpoint + secret + event subscriptions."
  exit 0
fi

if (( entitlement_updates == 0 )); then
  echo "PRIMARY BOTTLENECK: Entitlement write path after webhook."
  echo "TODAY ACTION: Inspect webhook handler DB write branch + D1 permissions."
  exit 0
fi

echo "STATUS: Funnel appears operational. Focus on traffic scale and conversion improvements."
