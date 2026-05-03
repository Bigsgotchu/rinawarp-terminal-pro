#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-https://www.rinawarptech.com}"
API="${API:-https://api.rinawarptech.com}"
PAGES="${PAGES:-https://rinawarptech-website.pages.dev}"
DOWNLOADS="${DOWNLOADS:-https://rinawarp-downloads.rinawarptech.workers.dev}"
VERIFY_URL="${VERIFY_URL:-https://rinawarptech.com/download/checksums}"
TEST_CUSTOMER_ID="${TEST_CUSTOMER_ID:-cus_TEST}"
FORCE_IPV4="${FORCE_IPV4:-1}"
RETRY_PROFILE="${RETRY_PROFILE:-fast}"
RESOLVE_WWW_IP="${RESOLVE_WWW_IP:-}"
RESOLVE_API_IP="${RESOLVE_API_IP:-}"
RESOLVE_PAGES_IP="${RESOLVE_PAGES_IP:-}"
RESOLVE_DOWNLOADS_IP="${RESOLVE_DOWNLOADS_IP:-}"
REPORT_DIR="${REPORT_DIR:-data/monitor}"

mkdir -p "$REPORT_DIR"
STAMP="$(date -u +"%Y%m%dT%H%M%SZ")"
REPORT_FILE="$REPORT_DIR/final-mile-$STAMP.log"

FAILED=0

echo "== Final Mile Gate =="
echo "BASE      : $BASE"
echo "API       : $API"
echo "PAGES     : $PAGES"
echo "DOWNLOADS : $DOWNLOADS"
echo "REPORT    : $REPORT_FILE"
echo "FORCE_IPV4: $FORCE_IPV4"
echo "RETRY     : $RETRY_PROFILE"
echo

run_step() {
  local name="$1"
  shift
  echo "== $name ==" | tee -a "$REPORT_FILE"
  if "$@" >>"$REPORT_FILE" 2>&1; then
    echo "✅ $name" | tee -a "$REPORT_FILE"
  else
    echo "❌ $name" | tee -a "$REPORT_FILE"
    FAILED=1
  fi
  echo | tee -a "$REPORT_FILE"
}

curl_with_network() {
  local url="$1"
  local args
  if [[ "$RETRY_PROFILE" == "fast" ]]; then
    args=(--silent --show-error --connect-timeout 5 --max-time 12 --retry 1 --retry-delay 1 --retry-all-errors)
  else
    args=(--silent --show-error --connect-timeout 10 --max-time 30 --retry 3 --retry-delay 1 --retry-all-errors)
  fi
  local host
  host="$(printf "%s" "$url" | sed -E 's#^[a-zA-Z]+://([^/:]+).*$#\1#')"
  local base_host api_host pages_host downloads_host
  base_host="$(printf "%s" "$BASE" | sed -E 's#^[a-zA-Z]+://([^/:]+).*$#\1#')"
  api_host="$(printf "%s" "$API" | sed -E 's#^[a-zA-Z]+://([^/:]+).*$#\1#')"
  pages_host="$(printf "%s" "$PAGES" | sed -E 's#^[a-zA-Z]+://([^/:]+).*$#\1#')"
  downloads_host="$(printf "%s" "$DOWNLOADS" | sed -E 's#^[a-zA-Z]+://([^/:]+).*$#\1#')"

  if [[ "$FORCE_IPV4" == "1" ]]; then
    args+=("-4")
  fi
  if [[ -n "$RESOLVE_WWW_IP" && "$host" == "$base_host" ]]; then
    args+=("--resolve" "${base_host}:443:${RESOLVE_WWW_IP}")
  fi
  if [[ -n "$RESOLVE_API_IP" && "$host" == "$api_host" ]]; then
    args+=("--resolve" "${api_host}:443:${RESOLVE_API_IP}")
  fi
  if [[ -n "$RESOLVE_PAGES_IP" && "$host" == "$pages_host" ]]; then
    args+=("--resolve" "${pages_host}:443:${RESOLVE_PAGES_IP}")
  fi
  if [[ -n "$RESOLVE_DOWNLOADS_IP" && "$host" == "$downloads_host" ]]; then
    args+=("--resolve" "${downloads_host}:443:${RESOLVE_DOWNLOADS_IP}")
  fi

  local raw code
  raw="$(curl "${args[@]}" -o /dev/null -w "%{http_code}" -L "$url" 2>/dev/null || true)"
  code="$(printf "%s" "$raw" | tail -c 3)"
  [[ "$code" =~ ^[0-9]{3}$ ]] || code="000"
  printf "%s" "$code"
}

net_env=(
  "FORCE_IPV4=$FORCE_IPV4"
  "RETRY_PROFILE=$RETRY_PROFILE"
  "CURL_RESOLVE_BASE_IP=$RESOLVE_WWW_IP"
  "CURL_RESOLVE_API_IP=$RESOLVE_API_IP"
  "CURL_RESOLVE_PAGES_IP=$RESOLVE_PAGES_IP"
  "CURL_RESOLVE_DL_IP=$RESOLVE_DOWNLOADS_IP"
  "CURL_RESOLVE_DOWNLOADS_IP=$RESOLVE_DOWNLOADS_IP"
  "CURL_RESOLVE_WWW_IP=$RESOLVE_WWW_IP"
  "CURL_RESOLVE_ORIGIN_IP=$RESOLVE_WWW_IP"
)

run_step "Pages parity" env "${net_env[@]}" bash scripts/smoke-pages.sh "$BASE" "$PAGES"
run_step "Prod route/API smoke" env "${net_env[@]}" bash scripts/smoke-prod.sh "$BASE" "$API"
run_step "Prod site audit" env "${net_env[@]}" bash scripts/audit-site.sh "$BASE" "$PAGES" "$VERIFY_URL"
run_step "Live release alignment" npm run verify:release-alignment -- "$BASE"
run_step "WWW vs Pages header/status compare" env "${net_env[@]}" bash scripts/audit-prod.sh "$BASE" "$PAGES"
run_step "Web smoke" env "${net_env[@]}" bash scripts/smoke-web.sh "$BASE" "$API"
run_step "Stripe API surface smoke" env "${net_env[@]}" bash scripts/smoke-stripe.sh "$API" "$BASE"
run_step "Revenue E2E smoke" env "${net_env[@]}" TEST_CUSTOMER_ID="$TEST_CUSTOMER_ID" bash scripts/e2e-revenue-smoke.sh "$BASE" "$API" "$DOWNLOADS"

echo "== Legal + Trust Pages ==" | tee -a "$REPORT_FILE"
for p in /terms/ /privacy/ /refunds/ /eula/ /pricing/ /contact/ /download/; do
  code="$(curl_with_network "$BASE$p")"
  if [[ "$code" == "200" ]]; then
    echo "✅ $p -> $code" | tee -a "$REPORT_FILE"
  else
    echo "❌ $p -> $code" | tee -a "$REPORT_FILE"
    FAILED=1
  fi
done
echo | tee -a "$REPORT_FILE"

if [[ "$FAILED" == "1" ]]; then
  echo "❌ FINAL MILE: BLOCKED" | tee -a "$REPORT_FILE"
  echo "See report: $REPORT_FILE"
  exit 1
fi

echo "✅ FINAL MILE: PASS" | tee -a "$REPORT_FILE"
echo "Report: $REPORT_FILE"
