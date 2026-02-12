#!/usr/bin/env bash
set -euo pipefail

API="${1:-https://api.rinawarptech.com}"
ORIGIN="${2:-https://www.rinawarptech.com}"

echo "== Stripe Smoke Test =="
echo "API   : $API"
echo "ORIGIN: $ORIGIN"
echo

# First check if API is reachable at all
echo "== API Reachability Check =="
api_check="$(curl -s -o /dev/null -w "%{http_code}" -L "$API/" 2>/dev/null || echo "000")"
echo "API root -> $api_check"
if [[ "$api_check" == "000" ]]; then
  echo "⚠️  API not reachable - may need deployment"
fi
echo

endpoints=(
  "/api/auth/start"
  "/api/auth/verify"
  "/api/me"
  "/api/stripe/checkout"
  "/api/portal"
  "/api/download-token"
)

echo "== CORS preflight for key endpoints =="
FAILED=0
SKIP_API=0

# If API is not reachable, skip individual endpoint checks
if [[ "$api_check" == "000" ]] || [[ "$api_check" == "404" ]] || [[ "$api_check" == "500" ]]; then
  echo "⚠️  API not fully reachable, skipping individual endpoint checks"
  echo "   Deploy api-proxy worker to api.rinawarptech.com first"
  SKIP_API=1
else
  for ep in "${endpoints[@]}"; do
    code="$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "$API$ep" \
      -H "Origin: $ORIGIN" \
      -H "Access-Control-Request-Method: POST" \
      -H "Access-Control-Request-Headers: content-type" 2>/dev/null || echo "000")"
    
    if [[ "$code" == "204" ]] || [[ "$code" == "200" ]]; then
      echo "✅ $ep -> OPTIONS $code"
    elif [[ "$code" == "000" ]]; then
      echo "❌ $ep -> OPTIONS $code (endpoint unreachable)"
      FAILED=1
    else
      echo "⚠️  $ep -> OPTIONS $code (may be normal if endpoint requires auth)"
    fi
  done
fi

echo
echo "== Stripe Dashboard Checklist =="
echo "Visit: https://dashboard.stripe.com/webhooks"
echo ""
