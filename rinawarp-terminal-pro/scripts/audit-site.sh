#!/usr/bin/env bash
set -euo pipefail

BASE="${1:-https://www.rinawarptech.com}"
PAGES="${2:-https://rinawarptech-website.pages.dev}"
DL_VERIFY="${3:-https://rinawarp-downloads.rinawarptech.workers.dev/verify/SHASUMS256.txt}"

echo "== Audit"
echo "BASE : $BASE"
echo "PAGES: $PAGES"
echo "VERIFY: $DL_VERIFY"
echo

check() {
  local url="$1"
  local expect="$2"
  local code
  code="$(curl -s -o /dev/null -w "%{http_code}" -L "$url")"
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
check "$BASE/releases/v1.0.0.json" 200 || FAILED=1
check "$DL_VERIFY" 200 || FAILED=1

echo
echo "== Manifest JSON validation"
MANIFEST_BODY="$(curl -fsS "$BASE/releases/v1.0.0.json" || true)"
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
curl -fsS "$BASE/releases/v1.0.0.json" | head -c 300 || true; echo; echo
curl -fsS "$DL_VERIFY" | sed 's/  */ /g' || true; echo

echo
if [[ "$FAILED" == "1" ]]; then
  echo "❌ FAIL: audit-site"
  exit 1
else
  echo "✅ PASS: audit-site"
  exit 0
fi
