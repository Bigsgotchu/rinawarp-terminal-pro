#!/usr/bin/env bash
set -euo pipefail

BASE="${1:-https://www.rinawarptech.com}"
API="${2:-https://api.rinawarptech.com}"

echo "== Smoke test BASE: $BASE"
echo "== Smoke test API : $API"
echo

check() {
  local path="$1"
  local want="$2"
  local url="${BASE}${path}"
  local code
  code="$(curl -s -o /dev/null -w "%{http_code}" -L "$url")"
  if [[ "$code" != "$want" ]]; then
    echo "❌ $path -> $code (expected $want)"
    exit 1
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
curl -fsS "${BASE}/_build.txt" || echo "(no _build.txt)"

echo
echo "== API CORS preflight: /api/auth/start =="
curl -fsS -D- -o /dev/null -X OPTIONS "${API}/api/auth/start" \
  -H "Origin: ${BASE}" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" \
  | sed -n '1,30p'

echo
echo "✅ PASS: smoke test complete"
