#!/usr/bin/env bash
set -euo pipefail

OUT_DIR="${1:-artifacts}"
mkdir -p "$OUT_DIR"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BUNDLE="$OUT_DIR/electron-smoke-failure-bundle-$STAMP.tgz"

declare -a INPUTS=()
for p in \
  "artifacts/diagnostics.json" \
  "artifacts/support-bundle-result.json" \
  "artifacts/support-bundle.zip" \
  "apps/terminal-pro/test-results" \
  "apps/terminal-pro/playwright-report" \
  "apps/terminal-pro/dist-electron"
do
  if [ -e "$p" ]; then
    INPUTS+=("$p")
  fi
done

if [ "${#INPUTS[@]}" -eq 0 ]; then
  echo "No failure inputs found; skipping bundle creation."
  exit 0
fi

tar -czf "$BUNDLE" "${INPUTS[@]}"
echo "Created $BUNDLE"
