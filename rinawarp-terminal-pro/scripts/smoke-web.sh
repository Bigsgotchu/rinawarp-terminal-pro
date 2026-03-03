#!/usr/bin/env bash
set -euo pipefail

BASE="${1:-https://www.rinawarptech.com}"
API="${2:-https://api.rinawarptech.com}"
RETRY_PROFILE="${RETRY_PROFILE:-default}"
if [[ "$RETRY_PROFILE" == "fast" ]]; then
  CURL_COMMON=(--silent --show-error --connect-timeout 5 --max-time 12 --retry 1 --retry-delay 1 --retry-all-errors)
else
  CURL_COMMON=(--silent --show-error --connect-timeout 10 --max-time 30 --retry 3 --retry-delay 1 --retry-all-errors)
fi
FAILED=0
FORCE_IPV4="${FORCE_IPV4:-0}"
CURL_RESOLVE_BASE_IP="${CURL_RESOLVE_BASE_IP:-}"
CURL_RESOLVE_API_IP="${CURL_RESOLVE_API_IP:-}"
BASE_HOST="$(printf "%s" "$BASE" | sed -E 's#^[a-zA-Z]+://([^/:]+).*$#\1#')"
API_HOST="$(printf "%s" "$API" | sed -E 's#^[a-zA-Z]+://([^/:]+).*$#\1#')"

echo "🔎 Smoke test BASE=$BASE API=$API"
echo "ℹ️  Retry profile: $RETRY_PROFILE"
if [[ "$FORCE_IPV4" == "1" ]]; then
  echo "ℹ️  Network mode: FORCE_IPV4=1"
fi
if [[ -n "$CURL_RESOLVE_BASE_IP" ]]; then
  echo "ℹ️  Network mode: pin $BASE_HOST -> $CURL_RESOLVE_BASE_IP"
fi
if [[ -n "$CURL_RESOLVE_API_IP" ]]; then
  echo "ℹ️  Network mode: pin $API_HOST -> $CURL_RESOLVE_API_IP"
fi

curl_with_network() {
  local url="$1"
  shift || true
  local args=("${CURL_COMMON[@]}")
  local host
  host="$(printf "%s" "$url" | sed -E 's#^[a-zA-Z]+://([^/:]+).*$#\1#')"

  if [[ "$FORCE_IPV4" == "1" ]]; then
    args+=("-4")
  fi

  if [[ -n "$CURL_RESOLVE_BASE_IP" && "$host" == "$BASE_HOST" ]]; then
    args+=("--resolve" "${BASE_HOST}:443:${CURL_RESOLVE_BASE_IP}")
  fi
  if [[ -n "$CURL_RESOLVE_API_IP" && "$host" == "$API_HOST" ]]; then
    args+=("--resolve" "${API_HOST}:443:${CURL_RESOLVE_API_IP}")
  fi

  curl "${args[@]}" "$@" "$url"
}

http_code() {
  local url="$1"
  local code
  code="$(curl_with_network "$url" -o /dev/null -w "%{http_code}" 2>/dev/null || true)"
  [[ "$code" =~ ^[0-9]{3}$ ]] || code="000"
  printf "%s" "$code"
}

check() {
  local url="$1"
  local expect="$2"
  local code
  code="$(http_code "$url")"
  if [[ "$code" != "$expect" ]]; then
    echo "❌ $url => $code (expected $expect)"
    FAILED=1
    return 0
  fi
  echo "✅ $url => $code"
}

echo "🔎 Checking static routes..."
check "$BASE/login/" "200"
check "$BASE/signup/" "200"
check "$BASE/qzje/" "200"
check "$BASE/account/" "200"

echo ""
echo "🔎 API preflight logout"
preflight="$(curl_with_network "$API/api/auth/logout" -i -X OPTIONS \
  -H "Origin: $BASE" \
  -H "Access-Control-Request-Method: POST" 2>/dev/null || true)"
if [[ -z "$preflight" ]]; then
  echo "❌ preflight request failed (empty response)"
  FAILED=1
else
  printf "%s\n" "$preflight" | head -25
  preflight_code="$(printf "%s\n" "$preflight" | head -1 | awk '{print $2}')"
  if [[ -z "${preflight_code:-}" || "$preflight_code" == "000" ]]; then
    echo "❌ preflight invalid status"
    FAILED=1
  fi
fi

echo ""
if [[ "$FAILED" == "1" ]]; then
  echo "❌ Smoke test failed"
  exit 1
fi

echo "✅ Smoke test complete"
