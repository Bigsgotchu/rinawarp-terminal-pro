#!/usr/bin/env bash
set -euo pipefail

BASE="${1:-https://www.rinawarptech.com}"
PAGES="${2:-https://rinawarptech-website.pages.dev}"
DL_VERIFY="${3:-https://rinawarp-downloads.rinawarptech.workers.dev/verify/SHASUMS256.txt}"
RETRY_PROFILE="${RETRY_PROFILE:-default}"
if [[ "$RETRY_PROFILE" == "fast" ]]; then
  CURL_COMMON=(--silent --show-error --connect-timeout 5 --max-time 12 --retry 1 --retry-delay 1 --retry-all-errors)
else
  CURL_COMMON=(--silent --show-error --connect-timeout 10 --max-time 30 --retry 3 --retry-delay 1 --retry-all-errors)
fi
FORCE_IPV4="${FORCE_IPV4:-0}"
CURL_RESOLVE_BASE_IP="${CURL_RESOLVE_BASE_IP:-}"
CURL_RESOLVE_PAGES_IP="${CURL_RESOLVE_PAGES_IP:-}"
CURL_RESOLVE_DL_IP="${CURL_RESOLVE_DL_IP:-}"
BASE_HOST="$(printf "%s" "$BASE" | sed -E 's#^[a-zA-Z]+://([^/:]+).*$#\1#')"
PAGES_HOST="$(printf "%s" "$PAGES" | sed -E 's#^[a-zA-Z]+://([^/:]+).*$#\1#')"
DL_HOST="$(printf "%s" "$DL_VERIFY" | sed -E 's#^[a-zA-Z]+://([^/:]+).*$#\1#')"

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
  if [[ -n "$CURL_RESOLVE_PAGES_IP" && "$host" == "$PAGES_HOST" ]]; then
    args+=("--resolve" "${PAGES_HOST}:443:${CURL_RESOLVE_PAGES_IP}")
  fi
  if [[ -n "$CURL_RESOLVE_DL_IP" && "$host" == "$DL_HOST" ]]; then
    args+=("--resolve" "${DL_HOST}:443:${CURL_RESOLVE_DL_IP}")
  fi

  curl "${args[@]}" "$@" "$url"
}

http_code() {
  local url="$1"
  local code
  code="$(curl_with_network "$url" -o /dev/null -w "%{http_code}" -L 2>/dev/null || true)"
  [[ "$code" =~ ^[0-9]{3}$ ]] || code="000"
  printf "%s" "$code"
}

DOWNLOAD_HTML="$(curl_with_network "$BASE/download" || true)"
RELEASE_VER="$(printf '%s' "$DOWNLOAD_HTML" | grep -oE 'RinaWarp-Terminal-Pro-[0-9]+\.[0-9]+\.[0-9]+' | head -n1 | sed -E 's/^RinaWarp-Terminal-Pro-//' || true)"
if [[ -z "$RELEASE_VER" ]]; then
  RELEASE_VER="$(ls -1 rinawarptech-website/web/releases/v*.json 2>/dev/null | sed -E 's#.*v([0-9]+\.[0-9]+\.[0-9]+)\.json#\1#' | sort -V | tail -n1 || true)"
fi
if [[ -z "$RELEASE_VER" ]]; then
  echo "❌ Could not resolve release version from /download or local manifests."
  exit 1
fi
MANIFEST_URL="$BASE/releases/v${RELEASE_VER}.json"

echo "== Audit"
echo "BASE : $BASE"
echo "PAGES: $PAGES"
echo "VERIFY: $DL_VERIFY"
echo "RELEASE: $RELEASE_VER"
echo "RETRY: $RETRY_PROFILE"
if [[ "$FORCE_IPV4" == "1" ]]; then
  echo "MODE : FORCE_IPV4=1"
fi
echo

check() {
  local url="$1"
  local expect="$2"
  local code
  code="$(http_code "$url")"
  if [[ "$code" == "$expect" ]]; then
    echo "✅ $url -> $code"
  else
    echo "❌ $url -> $code (expected $expect)"
    return 1
  fi
}

FAILED=0

# Core pages
check "$BASE/" 200 || FAILED=1
check "$BASE/download" 200 || check "$BASE/download/" 200 || FAILED=1
check "$BASE/login" 200 || check "$BASE/login/" 200 || FAILED=1
check "$BASE/signup" 200 || check "$BASE/signup/" 200 || FAILED=1
check "$BASE/account" 200 || check "$BASE/account/" 200 || FAILED=1

# qzje must exist on BOTH the Pages origin and the custom domain
check "$PAGES/qzje/" 200 || FAILED=1
check "$BASE/qzje/" 200 || FAILED=1

# Release manifest + shasums
check "$MANIFEST_URL" 200 || FAILED=1
check "$DL_VERIFY" 200 || FAILED=1

echo
echo "== Manifest JSON validation"
MANIFEST_BODY="$(curl_with_network "$MANIFEST_URL" || true)"
if [[ -z "$MANIFEST_BODY" ]]; then
  echo "❌ manifest body empty"
  FAILED=1
else
  if echo "$MANIFEST_BODY" | node -e 'const fs=require("fs"); try { const j = JSON.parse(fs.readFileSync(0, "utf8")); if (!j.version || !j.downloads) process.exit(2); } catch { process.exit(1); }'; then
    echo "✅ manifest is valid JSON with required keys"
  else
    echo "❌ manifest is not valid expected JSON (likely HTML fallback)"
    FAILED=1
  fi
fi

echo
echo "== Quick content sanity (manifest + shasums)"
curl_with_network "$MANIFEST_URL" | head -c 300 || true; echo; echo
curl_with_network "$DL_VERIFY" | sed 's/  */ /g' || true; echo

echo
if [[ "$FAILED" == "1" ]]; then
  echo "❌ FAIL: audit-site"
  exit 1
else
  echo "✅ PASS: audit-site"
  exit 0
fi
