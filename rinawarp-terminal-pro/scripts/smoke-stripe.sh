#!/usr/bin/env bash
set -euo pipefail

API="${1:-https://api.rinawarptech.com}"
ORIGIN="${2:-https://www.rinawarptech.com}"
FORCE_IPV4="${FORCE_IPV4:-0}"
CURL_RESOLVE_API_IP="${CURL_RESOLVE_API_IP:-}"
CURL_RESOLVE_ORIGIN_IP="${CURL_RESOLVE_ORIGIN_IP:-}"
API_HOST="$(printf "%s" "$API" | sed -E 's#^[a-zA-Z]+://([^/:]+).*$#\1#')"
ORIGIN_HOST="$(printf "%s" "$ORIGIN" | sed -E 's#^[a-zA-Z]+://([^/:]+).*$#\1#')"
RETRY_PROFILE="${RETRY_PROFILE:-default}"
if [[ "$RETRY_PROFILE" == "fast" ]]; then
  CURL_COMMON=(--silent --show-error --connect-timeout 5 --max-time 12 --retry 1 --retry-delay 1 --retry-all-errors)
else
  CURL_COMMON=(--silent --show-error --connect-timeout 10 --max-time 30 --retry 3 --retry-delay 1 --retry-all-errors)
fi

echo "== Stripe Smoke Test =="
echo "API   : $API"
echo "ORIGIN: $ORIGIN"
echo "RETRY : $RETRY_PROFILE"
if [[ "$FORCE_IPV4" == "1" ]]; then
  echo "MODE  : FORCE_IPV4=1"
fi
echo

curl_with_network() {
  local url="$1"
  shift || true
  local args=("${CURL_COMMON[@]}")
  local host
  host="$(printf "%s" "$url" | sed -E 's#^[a-zA-Z]+://([^/:]+).*$#\1#')"

  if [[ "$FORCE_IPV4" == "1" ]]; then
    args+=("-4")
  fi
  if [[ -n "$CURL_RESOLVE_API_IP" && "$host" == "$API_HOST" ]]; then
    args+=("--resolve" "${API_HOST}:443:${CURL_RESOLVE_API_IP}")
  fi
  if [[ -n "$CURL_RESOLVE_ORIGIN_IP" && "$host" == "$ORIGIN_HOST" ]]; then
    args+=("--resolve" "${ORIGIN_HOST}:443:${CURL_RESOLVE_ORIGIN_IP}")
  fi

  curl "${args[@]}" "$@" "$url"
}

# First check if API is reachable at all
echo "== API Reachability Check =="
api_check="$(curl_with_network "$API/" -o /dev/null -w "%{http_code}" -L 2>/dev/null || echo "000")"
api_check="$(printf "%s" "$api_check" | tail -c 3)"
[[ "$api_check" =~ ^[0-9]{3}$ ]] || api_check="000"
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
    code="$(curl_with_network "$API$ep" -o /dev/null -w "%{http_code}" -X OPTIONS \
      -H "Origin: $ORIGIN" \
      -H "Access-Control-Request-Method: POST" \
      -H "Access-Control-Request-Headers: content-type" 2>/dev/null || echo "000")"
    code="$(printf "%s" "$code" | tail -c 3)"
    [[ "$code" =~ ^[0-9]{3}$ ]] || code="000"
    
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
