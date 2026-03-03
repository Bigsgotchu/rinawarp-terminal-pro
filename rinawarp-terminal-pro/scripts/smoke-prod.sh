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
FORCE_IPV4="${FORCE_IPV4:-0}"
CURL_RESOLVE_BASE_IP="${CURL_RESOLVE_BASE_IP:-}"
CURL_RESOLVE_API_IP="${CURL_RESOLVE_API_IP:-}"
BASE_HOST="$(printf "%s" "$BASE" | sed -E 's#^[a-zA-Z]+://([^/:]+).*$#\1#')"
API_HOST="$(printf "%s" "$API" | sed -E 's#^[a-zA-Z]+://([^/:]+).*$#\1#')"
FAILED=0

echo "== Smoke test BASE: $BASE"
echo "== Smoke test API : $API"
echo "== Retry profile  : $RETRY_PROFILE"
if [[ "$FORCE_IPV4" == "1" ]]; then
  echo "== Network mode   : FORCE_IPV4=1"
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
  if [[ -n "$CURL_RESOLVE_BASE_IP" && "$host" == "$BASE_HOST" ]]; then
    args+=("--resolve" "${BASE_HOST}:443:${CURL_RESOLVE_BASE_IP}")
  fi
  if [[ -n "$CURL_RESOLVE_API_IP" && "$host" == "$API_HOST" ]]; then
    args+=("--resolve" "${API_HOST}:443:${CURL_RESOLVE_API_IP}")
  fi

  curl "${args[@]}" "$@" "$url"
}

check() {
  local path="$1"
  local want="$2"
  local url="${BASE}${path}"
  local code
  code="$(curl_with_network "$url" -o /dev/null -w "%{http_code}" -L 2>/dev/null || true)"
  [[ "$code" =~ ^[0-9]{3}$ ]] || code="000"
  if [[ "$code" != "$want" ]]; then
    echo "❌ $path -> $code (expected $want)"
    FAILED=1
    return 0
  fi
  echo "✅ $path -> $code"
}

# Core routes
check "/" "200"
check "/download/" "200"        # after redirects
check "/login/" "200"
check "/signup/" "200"
check "/account/" "200"
check "/qzje/" "200"

echo
echo "== Build fingerprint (if present) =="
curl_with_network "${BASE}/_build.txt" || echo "(no _build.txt)"

echo
echo "== API CORS preflight: /api/auth/start =="
preflight="$(curl_with_network "${API}/api/auth/start" -D- -o /dev/null -X OPTIONS \
  -H "Origin: ${BASE}" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" 2>/dev/null || true)"
if [[ -z "$preflight" ]]; then
  echo "❌ API preflight request failed"
  FAILED=1
else
  printf "%s\n" "$preflight" | sed -n '1,30p'
fi

echo
if [[ "$FAILED" == "1" ]]; then
  echo "❌ FAIL: smoke test complete with errors"
  exit 1
fi

echo "✅ PASS: smoke test complete"
