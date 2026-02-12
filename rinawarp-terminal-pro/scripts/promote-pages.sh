#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   CF_API_TOKEN=... CF_ACCOUNT_ID=... CF_PAGES_PROJECT=... ./scripts/promote-pages.sh <deployment-id>
#
# Example:
#   CF_API_TOKEN=xxx CF_ACCOUNT_ID=ba2... CF_PAGES_PROJECT=rinawarptech-website ./scripts/promote-pages.sh eaca7773-d5f1-4bff-8ca3-cb02a6330ea8

: "${CF_API_TOKEN:?missing CF_API_TOKEN}"
: "${CF_ACCOUNT_ID:?missing CF_ACCOUNT_ID}"
: "${CF_PAGES_PROJECT:?missing CF_PAGES_PROJECT}"

DEPLOYMENT_ID="${1:?missing deployment id}"

API="https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects/${CF_PAGES_PROJECT}/deployments/${DEPLOYMENT_ID}/promote"

echo "=== Promoting ${DEPLOYMENT_ID} to production ==="
echo "Project: ${CF_PAGES_PROJECT}"
echo "Account: ${CF_ACCOUNT_ID}"
echo "POST: ${API}"
echo

# Do the request, capture status + body
tmp="$(mktemp)"
http_code="$(
  curl -sS -o "$tmp" -w "%{http_code}" \
    -X POST "$API" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    -H "Content-Type: application/json"
)"

echo "HTTP: ${http_code}"
echo "Body:"
cat "$tmp"
echo

# If not 200/201, exit with useful info
if [[ "$http_code" != "200" && "$http_code" != "201" ]]; then
  echo "❌ Promote failed (HTTP ${http_code}). Check token permissions + project id."
  rm -f "$tmp"
  exit 1
fi

# Parse JSON only if jq exists; otherwise just succeed
if command -v jq >/dev/null 2>&1; then
  ok="$(jq -r '.success // empty' < "$tmp")"
  if [[ "$ok" != "true" ]]; then
    echo "❌ API returned success != true"
    rm -f "$tmp"
    exit 1
  fi
  echo "✅ Promote request accepted."
else
  echo "✅ Promote request sent (jq not installed; skipping JSON parse)."
fi

rm -f "$tmp"
