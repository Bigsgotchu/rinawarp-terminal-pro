#!/usr/bin/env bash
set -euo pipefail

SITE_BASE="${1:-https://www.rinawarptech.com}"
API_BASE="${2:-https://api.rinawarptech.com}"
DOWNLOADS_BASE="${3:-https://rinawarp-downloads.rinawarptech.workers.dev}"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

fetch_code() {
  local url="$1"
  curl -sS -L -o /dev/null -w '%{http_code}' "$url"
}

fetch_body() {
  local url="$1"
  local out="$2"
  curl -fsSL "$url" > "$out"
}

extract_json_value() {
  local pattern="$1"
  local file="$2"
  rg -o "$pattern" "$file" | head -n1 | sed -E 's/.*"([^"]+)".*/\1/' || true
}

extract_manifest_field() {
  local path_expr="$1"
  local file="$2"
  node - <<'NODE' "$file" "$path_expr"
const fs = require('fs')
const [file, pathExpr] = process.argv.slice(2)
const data = JSON.parse(fs.readFileSync(file, 'utf8'))
const value = pathExpr.split('.').reduce((acc, key) => (acc && Object.prototype.hasOwnProperty.call(acc, key) ? acc[key] : undefined), data)
if (value !== undefined && value !== null) process.stdout.write(String(value))
NODE
}

site_home_code="$(fetch_code "${SITE_BASE%/}/")"
site_pricing_code="$(fetch_code "${SITE_BASE%/}/pricing/")"
site_download_code="$(fetch_code "${SITE_BASE%/}/download/")"
api_health_code="$(fetch_code "${API_BASE%/}/api/health")"
downloads_health_code="$(fetch_code "${DOWNLOADS_BASE%/}/verify/SHASUMS256.txt" || true)"

manifest_file="$tmp_dir/latest.json"
fetch_body "${SITE_BASE%/}/releases/latest.json" "$manifest_file"

manifest_version="$(extract_json_value '"version"[[:space:]]*:[[:space:]]*"[^"]+"' "$manifest_file")"
manifest_notes="$(extract_json_value '"notes"[[:space:]]*:[[:space:]]*"[^"]+"' "$manifest_file")"

linux_name="$(extract_manifest_field 'files.linux.name' "$manifest_file")"
windows_name="$(extract_manifest_field 'files.windows.name' "$manifest_file")"

echo "RinaWarp KPI Snapshot"
echo "Date: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo
echo "Website"
echo "- Home: ${site_home_code}"
echo "- Pricing: ${site_pricing_code}"
echo "- Download: ${site_download_code}"
echo
echo "API"
echo "- Health: ${api_health_code}"
echo
echo "Release"
echo "- Version: ${manifest_version:-unknown}"
echo "- Notes: ${manifest_notes:-unknown}"
echo "- Linux artifact: ${linux_name:-unknown}"
echo "- Windows artifact: ${windows_name:-unknown}"
echo
echo "Legacy Surface"
echo "- Old downloads worker checksum URL: ${downloads_health_code:-unreachable}"
