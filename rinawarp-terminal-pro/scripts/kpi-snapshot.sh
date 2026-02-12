#!/usr/bin/env bash
set -euo pipefail

BASE="${1:-https://www.rinawarptech.com}"
API="${2:-https://api.rinawarptech.com}"
DOWNLOADS="${3:-https://rinawarp-downloads.rinawarptech.workers.dev}"
TEST_CUSTOMER_ID="${TEST_CUSTOMER_ID:-cus_TEST}"
OUT="${OUT:-}"

http_code() {
  curl -s -o /dev/null -w "%{http_code}" -L "$1" || echo "000"
}

json_escape() {
  printf '%s' "$1" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>process.stdout.write(JSON.stringify(d)))'
}

download_html="$(curl -fsSL "$BASE/download" || true)"
release_ver="$(printf '%s' "$download_html" | grep -oE 'RinaWarp Terminal Pro v[0-9]+\.[0-9]+\.[0-9]+' | head -n1 | sed -E 's/^RinaWarp Terminal Pro v//' || true)"
if [[ -z "$release_ver" ]]; then
  release_ver="$(printf '%s' "$download_html" | grep -oE 'RinaWarp-Terminal-Pro-[0-9]+\.[0-9]+\.[0-9]+' | head -n1 | sed -E 's/^RinaWarp-Terminal-Pro-//' || true)"
fi
[[ -n "$release_ver" ]] || release_ver="unknown"

build_fp="$(curl -fsS "$BASE/_build.txt" 2>/dev/null || true)"
manifest_code="$(http_code "$BASE/releases/v$release_ver.json")"
verify_code="$(http_code "$DOWNLOADS/verify/SHASUMS256.txt")"
api_preflight="$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "$API/api/auth/start" \
  -H "Origin: $BASE" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" || echo "000")"

token_json="$(curl -fsS "$DOWNLOADS/api/download-token?customer_id=$TEST_CUSTOMER_ID" || true)"
token="$(printf '%s' "$token_json" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{const j=JSON.parse(d);process.stdout.write(j.token||"")}catch{process.stdout.write("")}})')"

download_head_code="000"
if [[ -n "$token" && "$release_ver" != "unknown" ]]; then
  download_head_code="$(curl -s -o /dev/null -w "%{http_code}" -I "$DOWNLOADS/downloads/RinaWarp-Terminal-Pro-$release_ver.AppImage?token=$token" || echo "000")"
fi

ts="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
payload="$(cat <<JSON
{
  "timestamp_utc": "$ts",
  "base_url": "$BASE",
  "api_url": "$API",
  "downloads_url": "$DOWNLOADS",
  "kpis": {
    "core_route_ok_ratio": {
      "label": "core routes /,/pricing,/download,/login,/signup,/account",
      "value": "$(for p in / /pricing/ /download/ /login/ /signup/ /account/; do c="$(http_code "$BASE$p")"; [[ "$c" == "200" ]] && printf "1\n" || printf "0\n"; done | awk '{s+=$1} END {printf "%d/6", s}')"
    },
    "build_fingerprint": $(json_escape "$build_fp"),
    "release_version_detected": "$release_ver",
    "release_manifest_http": "$manifest_code",
    "verify_shasums_http": "$verify_code",
    "api_auth_preflight_http": "$api_preflight",
    "download_token_mint_ok": $([[ -n "$token" ]] && echo "true" || echo "false"),
    "gated_download_head_http": "$download_head_code"
  }
}
JSON
)"

if [[ -n "$OUT" ]]; then
  printf '%s\n' "$payload" > "$OUT"
  echo "✅ Wrote KPI snapshot: $OUT"
else
  printf '%s\n' "$payload"
fi
