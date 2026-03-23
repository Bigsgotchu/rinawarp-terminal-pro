#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if rg -n '"[^"]*playwright test' apps/terminal-pro/package.json >/tmp/rina-e2e-launch-check.txt; then
  echo "[check-e2e-launch] Found raw playwright invocations in apps/terminal-pro/package.json:" >&2
  cat /tmp/rina-e2e-launch-check.txt >&2
  rm -f /tmp/rina-e2e-launch-check.txt
  exit 1
fi

rm -f /tmp/rina-e2e-launch-check.txt
echo "[check-e2e-launch] OK"
