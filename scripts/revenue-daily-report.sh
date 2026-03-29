#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SITE_BASE="${1:-https://www.rinawarptech.com}"
API_BASE="${2:-https://www.rinawarptech.com}"
DOWNLOADS_BASE="${3:-https://rinawarp-downloads.rinawarptech.workers.dev}"

echo "RinaWarp Daily Release and Revenue Report"
echo "Date: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo

echo "Release Surface"
bash scripts/kpi-snapshot.sh "$SITE_BASE" "$API_BASE" "$DOWNLOADS_BASE"
echo

echo "Revenue Smoke"
bash scripts/smoke-stripe.sh "$API_BASE" "$SITE_BASE"
