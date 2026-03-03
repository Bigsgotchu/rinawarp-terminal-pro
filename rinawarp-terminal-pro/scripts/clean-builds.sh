#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Cleaning build outputs under $ROOT"

rm -rf \
  "$ROOT/apps/terminal-pro/dist" \
  "$ROOT/apps/terminal-pro/dist-electron" \
  "$ROOT/apps/terminal-pro/out" \
  "$ROOT/apps/terminal-pro/.vite" \
  "$ROOT/apps/terminal-pro/test-results" \
  "$ROOT/release"

find "$ROOT" -type d \( -name ".vite" -o -name ".turbo" -o -name "dist" -o -name "dist-electron" -o -name "out" \) \
  -not -path "*/node_modules/*" \
  -prune -exec rm -rf {} + 2>/dev/null || true

echo "Clean complete"
