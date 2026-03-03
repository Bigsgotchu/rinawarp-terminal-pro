#!/usr/bin/env bash
set -euo pipefail

BASE="${1:-https://www.rinawarptech.com}"
API="${2:-https://api.rinawarptech.com}"
DOWNLOADS="${3:-https://rinawarp-downloads.rinawarptech.workers.dev}"
TEST_CUSTOMER_ID="${TEST_CUSTOMER_ID:-cus_TEST}"
RETRY_PROFILE="${RETRY_PROFILE:-default}"
if [[ "$RETRY_PROFILE" == "fast" ]]; then
  CURL_COMMON=(--silent --show-error --connect-timeout 5 --max-time 12 --retry 1 --retry-delay 1 --retry-all-errors)
else
  CURL_COMMON=(--silent --show-error --connect-timeout 10 --max-time 30 --retry 3 --retry-delay 1 --retry-all-errors)
fi
FORCE_IPV4="${FORCE_IPV4:-0}"
CURL_RESOLVE_BASE_IP="${CURL_RESOLVE_BASE_IP:-}"
CURL_RESOLVE_API_IP="${CURL_RESOLVE_API_IP:-}"
CURL_RESOLVE_DOWNLOADS_IP="${CURL_RESOLVE_DOWNLOADS_IP:-}"
BASE_HOST="$(printf "%s" "$BASE" | sed -E 's#^[a-zA-Z]+://([^/:]+).*$#\1#')"
API_HOST="$(printf "%s" "$API" | sed -E 's#^[a-zA-Z]+://([^/:]+).*$#\1#')"
DOWNLOADS_HOST="$(printf "%s" "$DOWNLOADS" | sed -E 's#^[a-zA-Z]+://([^/:]+).*$#\1#')"

echo "== Revenue E2E Smoke =="
echo "BASE      : $BASE"
echo "API       : $API"
echo "DOWNLOADS : $DOWNLOADS"
echo "CUSTOMER  : $TEST_CUSTOMER_ID"
echo "RETRY     : $RETRY_PROFILE"
if [[ "$FORCE_IPV4" == "1" ]]; then
  echo "MODE      : FORCE_IPV4=1"
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
  if [[ -n "$CURL_RESOLVE_DOWNLOADS_IP" && "$host" == "$DOWNLOADS_HOST" ]]; then
    args+=("--resolve" "${DOWNLOADS_HOST}:443:${CURL_RESOLVE_DOWNLOADS_IP}")
  fi

  curl "${args[@]}" "$@" "$url"
}

check_status() {
  local url="$1"
  local want="$2"
  local code
  code="$(curl_with_network "$url" -o /dev/null -w "%{http_code}" -L 2>/dev/null || true)"
  [[ "$code" =~ ^[0-9]{3}$ ]] || code="000"
  if [[ "$code" != "$want" ]]; then
    echo "❌ $url -> $code (expected $want)"
    exit 1
  fi
  echo "✅ $url -> $code"
}

extract_release_version() {
  local html="$1"
  local ver
  ver="$(printf '%s' "$html" | grep -oE 'RinaWarp Terminal Pro v[0-9]+\.[0-9]+\.[0-9]+' | head -n1 | sed -E 's/^RinaWarp Terminal Pro v//' || true)"
  if [[ -z "$ver" ]]; then
    ver="$(printf '%s' "$html" | grep -oE 'RinaWarp-Terminal-Pro-[0-9]+\.[0-9]+\.[0-9]+' | head -n1 | sed -E 's/^RinaWarp-Terminal-Pro-//' || true)"
  fi
  [[ -n "$ver" ]] || ver="1.0.1"
  printf '%s' "$ver"
}

echo "== 1) Core funnel pages =="
check_status "$BASE/" 200
check_status "$BASE/pricing/" 200
check_status "$BASE/download/" 200
check_status "$BASE/login/" 200
check_status "$BASE/signup/" 200
check_status "$BASE/account/" 200

echo
echo "== 2) Resolve active release version =="
DOWNLOAD_HTML="$(curl_with_network "$BASE/download")"
VER="$(extract_release_version "$DOWNLOAD_HTML")"
echo "✅ Active version: $VER"

MANIFEST_URL="$BASE/releases/v${VER}.json"
check_status "$MANIFEST_URL" 200

echo
echo "== 3) Verify checksum endpoint alignment =="
SHASUMS_URL="$DOWNLOADS/verify/SHASUMS256.txt"
check_status "$SHASUMS_URL" 200
SHASUMS_BODY="$(curl_with_network "$SHASUMS_URL")"
for f in \
  "RinaWarp-Terminal-Pro-$VER.AppImage" \
  "RinaWarp-Terminal-Pro-$VER.amd64.deb" \
  "RinaWarp-Terminal-Pro-$VER.exe"
do
  if printf '%s\n' "$SHASUMS_BODY" | grep -q "$f"; then
    echo "✅ checksums include $f"
  else
    echo "❌ checksums missing $f"
    exit 1
  fi
done

echo
echo "== 4) API CORS + auth surface =="
preflight="$(curl_with_network "$API/api/auth/start" -o /dev/null -w "%{http_code}" -X OPTIONS \
  -H "Origin: $BASE" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" 2>/dev/null || true)"
[[ "$preflight" =~ ^[0-9]{3}$ ]] || preflight="000"
if [[ "$preflight" != "204" && "$preflight" != "200" ]]; then
  echo "❌ API preflight /api/auth/start -> $preflight"
  exit 1
fi
echo "✅ API preflight /api/auth/start -> $preflight"

echo
echo "== 5) Token mint + gated installer download (revenue-critical) =="
TOKEN_JSON="$(curl_with_network "$DOWNLOADS/api/download-token?customer_id=$TEST_CUSTOMER_ID" || true)"
TOKEN="$(printf '%s' "$TOKEN_JSON" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{const j=JSON.parse(d);process.stdout.write(j.token||"")}catch{process.stdout.write("")}})')"
if [[ -z "$TOKEN" ]]; then
  echo "❌ Failed to mint download token for $TEST_CUSTOMER_ID"
  echo "Response: ${TOKEN_JSON:-<empty>}"
  echo "Hint: seed/activate entitlement for $TEST_CUSTOMER_ID in rinawarp-prod"
  exit 1
fi
echo "✅ Token minted"

DL_URL="$DOWNLOADS/downloads/RinaWarp-Terminal-Pro-$VER.AppImage?token=$TOKEN"
dl_code="$(curl_with_network "$DL_URL" -s -o /dev/null -w "%{http_code}" -I 2>/dev/null || true)"
[[ "$dl_code" =~ ^[0-9]{3}$ ]] || dl_code="000"
if [[ "$dl_code" != "200" ]]; then
  echo "❌ Gated download failed -> $dl_code"
  exit 1
fi
echo "✅ Gated download HEAD -> $dl_code"

disp="$(curl_with_network "$DL_URL" -I | tr -d '\r' | awk -F': ' 'tolower($1)=="content-disposition"{print $2}' | head -n1)"
if [[ "$disp" != *"RinaWarp-Terminal-Pro-$VER.AppImage"* ]]; then
  echo "❌ Unexpected content-disposition: ${disp:-<empty>}"
  exit 1
fi
echo "✅ content-disposition includes release filename"

echo
echo "✅ PASS: revenue E2E smoke complete"
