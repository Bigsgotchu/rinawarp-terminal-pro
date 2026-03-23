#!/usr/bin/env bash
set -euo pipefail

SITE_BASE="${1:-https://www.rinawarptech.com}"
API_BASE="${2:-https://api.rinawarptech.com}"
DOWNLOADS_BASE="${3:-https://rinawarp-downloads.rinawarptech.workers.dev}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[e2e:revenue] Running billing smoke"
bash scripts/smoke-stripe.sh "$API_BASE" "$SITE_BASE"

echo "[e2e:revenue] Checking public release manifest"
download_tmp="$(mktemp)"
manifest_url="${SITE_BASE%/}/releases/latest.json"
if ! curl -fsS -o "$download_tmp" -w '%{http_code}' "$manifest_url" | grep -qx '200'; then
  rm -f "$download_tmp"
  echo "[e2e:revenue] Release manifest missing at $manifest_url" >&2
  exit 1
fi
rg -q '"version"' "$download_tmp"
rg -q '"files"' "$download_tmp"
rg -q '"platforms"' "$download_tmp"
rg -q '"linux"' "$download_tmp"
rm -f "$download_tmp"

echo "[e2e:revenue] Running desktop revenue flow E2E"
(
  cd apps/terminal-pro
  bash scripts/run-electron-playwright.sh tests/e2e/revenue-flow.electron.spec.ts
)

echo "[e2e:revenue] PASS"
