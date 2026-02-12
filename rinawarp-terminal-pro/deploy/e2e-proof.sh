#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-https://api.rinawarptech.com}"
DL_BASE="${DL_BASE:-https://rinawarptech.com/downloads}"

CUSTOMER_ID="${1:-}"
FILE="${2:-RinaWarp-Terminal-Pro-1.0.0.dmg}"

if [[ -z "$CUSTOMER_ID" ]]; then
  echo "Usage: $0 cus_XXXXXXXX [filename]"
  echo "Example: $0 cus_123 RinaWarp-Terminal-Pro-1.0.0.dmg"
  exit 1
fi

echo "== 1) Check entitlement exists in D1 (requires wrangler access) =="
if command -v wrangler >/dev/null 2>&1; then
  wrangler d1 execute rinawarp-prod --command \
    "SELECT customer_id, tier, status, updated_at FROM entitlements WHERE customer_id = '$CUSTOMER_ID' LIMIT 1;" \
    || true
else
  echo "wrangler not found; skipping D1 check"
fi

echo
echo "== 2) Mint download token from API =="
TOKEN_JSON="$(curl -sS "$API_BASE/api/download-token?customer_id=$CUSTOMER_ID")"
echo "$TOKEN_JSON" | python -m json.tool >/dev/null 2>&1 || { echo "$TOKEN_JSON"; exit 1; }

TOKEN="$(echo "$TOKEN_JSON" | python - <<'PY'
import sys, json
d=json.load(sys.stdin)
print(d.get("token",""))
PY
)"

if [[ -z "$TOKEN" ]]; then
  echo "❌ Failed to mint token. Response:"
  echo "$TOKEN_JSON"
  exit 1
fi

echo "✅ Token minted."

echo
echo "== 3) HEAD request to download URL with token =="
URL="$DL_BASE/$FILE?token=$TOKEN"
echo "$URL"
HEADERS="$(curl -sSI "$URL" || true)"

echo "$HEADERS" | egrep -i "HTTP/|content-type|content-disposition|content-length|cf-cache-status" || true

HTTP="$(echo "$HEADERS" | awk 'toupper($0) ~ /^HTTP\// {print $2; exit}')"
CTYPE="$(echo "$HEADERS" | awk -F': ' 'tolower($1)=="content-type" {print tolower($2); exit}' | tr -d '\r')"

if [[ "$HTTP" != "200" ]]; then
  echo "❌ Expected HTTP 200, got $HTTP"
  exit 1
fi

if [[ "$CTYPE" == *"text/html"* ]]; then
  echo "❌ Download served HTML (routing/auth broken)."
  exit 1
fi

echo "✅ Download access verified (non-HTML, HTTP 200)."
