#!/usr/bin/env bash
set -euo pipefail

WWW="${1:-https://www.rinawarptech.com}"
PAGES="${2:-https://rinawarptech-website.pages.dev}"
RETRY_PROFILE="${RETRY_PROFILE:-default}"
if [[ "$RETRY_PROFILE" == "fast" ]]; then
  CURL_COMMON=(--silent --show-error --connect-timeout 5 --max-time 12 --retry 1 --retry-delay 1 --retry-all-errors)
else
  CURL_COMMON=(--silent --show-error --connect-timeout 10 --max-time 30 --retry 3 --retry-delay 1 --retry-all-errors)
fi
FORCE_IPV4="${FORCE_IPV4:-0}"
CURL_RESOLVE_WWW_IP="${CURL_RESOLVE_WWW_IP:-}"
CURL_RESOLVE_PAGES_IP="${CURL_RESOLVE_PAGES_IP:-}"
WWW_HOST="$(printf "%s" "$WWW" | sed -E 's#^[a-zA-Z]+://([^/:]+).*$#\1#')"
PAGES_HOST="$(printf "%s" "$PAGES" | sed -E 's#^[a-zA-Z]+://([^/:]+).*$#\1#')"

paths=(
  "/"
  "/download/"
  "/login/"
  "/signup/"
  "/account/"
  "/qzje/"
  "/_build.txt"
)

echo "== Comparing WWW vs Pages for key routes =="
echo "WWW  : $WWW"
echo "PAGES: $PAGES"
echo "MODE : retry=$RETRY_PROFILE"
if [[ "$FORCE_IPV4" == "1" ]]; then
  echo "MODE : FORCE_IPV4=1"
fi
if [[ -n "$CURL_RESOLVE_WWW_IP" ]]; then
  echo "MODE : pin $WWW_HOST -> $CURL_RESOLVE_WWW_IP"
fi
if [[ -n "$CURL_RESOLVE_PAGES_IP" ]]; then
  echo "MODE : pin $PAGES_HOST -> $CURL_RESOLVE_PAGES_IP"
fi
echo

FAILED=0

curl_with_network() {
  local url="$1"
  shift || true
  local args=("${CURL_COMMON[@]}")
  local host
  host="$(printf "%s" "$url" | sed -E 's#^[a-zA-Z]+://([^/:]+).*$#\1#')"

  if [[ "$FORCE_IPV4" == "1" ]]; then
    args+=("-4")
  fi

  if [[ -n "$CURL_RESOLVE_WWW_IP" && "$host" == "$WWW_HOST" ]]; then
    args+=("--resolve" "${WWW_HOST}:443:${CURL_RESOLVE_WWW_IP}")
  fi
  if [[ -n "$CURL_RESOLVE_PAGES_IP" && "$host" == "$PAGES_HOST" ]]; then
    args+=("--resolve" "${PAGES_HOST}:443:${CURL_RESOLVE_PAGES_IP}")
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

header_snippet() {
  local url="$1"
  local headers
  headers="$(curl_with_network "$url" -I 2>/dev/null || true)"
  if [[ -z "$headers" ]]; then
    echo "    (header request failed)"
    return
  fi
  printf "%s\n" "$headers" | grep -Ei '^(cf-ray|server|cf-cache-status|location|x-content-type-options|content-security-policy)' | sed 's/^/    /' || true
}

for p in "${paths[@]}"; do
  w_code="$(http_code "$WWW$p")"
  p_code="$(http_code "$PAGES$p")"
  
  echo "$p"
  echo "  WWW  -> $w_code"
  echo "  PAGES -> $p_code"

  if [[ "$w_code" == "000" || "$p_code" == "000" ]]; then
    echo "  ❌ REQUEST FAILURE (network or DNS)"
    FAILED=1
  fi

  if [[ "$w_code" != "$p_code" ]]; then
    echo "  ⚠️  MISMATCH DETECTED"
    FAILED=1
  fi

  # show identifying headers
  echo "  WWW headers:"
  w_headers="$(header_snippet "$WWW$p")"
  if [[ -n "$w_headers" ]]; then
    echo "$w_headers"
  else
    echo "    (no identifying headers)"
  fi
  
  echo "  PAGES headers:"
  p_headers="$(header_snippet "$PAGES$p")"
  if [[ -n "$p_headers" ]]; then
    echo "$p_headers"
  else
    echo "    (no identifying headers)"
  fi
  echo
done

echo
if [[ "$FAILED" == "1" ]]; then
  echo "❌ FAIL: Route mismatches detected"
  exit 1
else
  echo "✅ PASS: All routes match between WWW and PAGES"
  exit 0
fi
