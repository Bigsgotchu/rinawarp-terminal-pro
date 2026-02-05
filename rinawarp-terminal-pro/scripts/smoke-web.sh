#!/usr/bin/env bash
set -euo pipefail

BASE="${1:-https://www.rinawarptech.com}"
API="${2:-https://api.rinawarptech.com}"

echo "🔎 Smoke test BASE=$BASE API=$API"

check() {
  local url="$1"
  local expect="$2"
  local code
  code="$(curl -s -o /dev/null -w "%{http_code}" "$url")"
  if [[ "$code" != "$expect" ]]; then
    echo "❌ $url => $code (expected $expect)"
    exit 1
  fi
  echo "✅ $url => $code"
}

echo "🔎 Checking static routes..."
check "$BASE/login/" "200"
check "$BASE/signup/" "200"
check "$BASE/qzje/" "200"
check "$BASE/account/" "200" || true

echo ""
echo "🔎 API preflight logout"
curl -si -X OPTIONS "$API/api/auth/logout" \
  -H "Origin: $BASE" \
  -H "Access-Control-Request-Method: POST" | head -25

echo ""
echo "✅ Smoke test complete"
