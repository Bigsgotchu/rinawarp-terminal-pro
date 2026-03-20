#!/usr/bin/env bash
set -euo pipefail

API_BASE="${1:-https://api.rinawarptech.com}"
SITE_BASE="${2:-https://www.rinawarptech.com}"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

check_get() {
  local url="$1"
  local out="$2"
  local code
  code="$(curl -sS -o "$out" -w '%{http_code}' "$url")"
  if [[ "$code" != "200" ]]; then
    echo "[smoke:stripe] GET $url -> $code" >&2
    if [[ "$code" == "429" ]]; then
      echo "[smoke:stripe] Cloudflare or upstream rate limiting is blocking the public API smoke check." >&2
      echo "[smoke:stripe] Response body:" >&2
      sed -n '1,20p' "$out" >&2 || true
    fi
    exit 1
  fi
}

check_post() {
  local url="$1"
  local body="$2"
  local out="$3"
  local code
  code="$(curl -sS -o "$out" -w '%{http_code}' -X POST -H 'content-type: application/json' -d "$body" "$url")"
  if [[ "$code" != "200" ]]; then
    echo "[smoke:stripe] POST $url -> $code" >&2
    if [[ "$code" == "429" ]]; then
      echo "[smoke:stripe] Cloudflare or upstream rate limiting is blocking the public API smoke check." >&2
      echo "[smoke:stripe] Response body:" >&2
      sed -n '1,20p' "$out" >&2 || true
    fi
    exit 1
  fi
}

echo "[smoke:stripe] Checking API health"
check_get "${API_BASE%/}/api/health" "$TMP_DIR/health.json"
rg -q '"status"\s*:\s*"ok"' "$TMP_DIR/health.json"

echo "[smoke:stripe] Checking pricing page"
check_get "${SITE_BASE%/}/pricing" "$TMP_DIR/pricing.html"
rg -q 'Pricing Plans - RinaWarp Terminal Pro|Simple, Transparent Pricing' "$TMP_DIR/pricing.html"
rg -q '<h2>Pro</h2>' "$TMP_DIR/pricing.html"
rg -q '<h2>Creator</h2>' "$TMP_DIR/pricing.html"
rg -q '<h2>Team</h2>' "$TMP_DIR/pricing.html"
rg -q '\$29<span>/month</span>' "$TMP_DIR/pricing.html"
rg -q '\$69<span>/month</span>' "$TMP_DIR/pricing.html"
rg -q '\$99<span>/month</span>' "$TMP_DIR/pricing.html"

echo "[smoke:stripe] Checking checkout endpoint"
check_post "${API_BASE%/}/api/checkout" '{"email":"nobody@example.com"}' "$TMP_DIR/checkout.json"
rg -q '"checkoutUrl"\s*:\s*"https://checkout\.stripe\.com/' "$TMP_DIR/checkout.json"

echo "[smoke:stripe] Checking portal endpoint"
check_post "${API_BASE%/}/api/portal" '{"email":"nobody@example.com"}' "$TMP_DIR/portal.json"
rg -q '"url"\s*:\s*"https://billing\.stripe\.com/' "$TMP_DIR/portal.json"

echo "[smoke:stripe] Checking lookup endpoint"
check_post "${API_BASE%/}/api/license/lookup-by-email" '{"email":"nobody@example.com"}' "$TMP_DIR/lookup.json"
rg -q '"ok"\s*:\s*true' "$TMP_DIR/lookup.json"

echo "[smoke:stripe] PASS"
