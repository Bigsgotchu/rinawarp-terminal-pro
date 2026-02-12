#!/usr/bin/env bash
set -euo pipefail

TIMEOUT_SEC="${LINUX_PACKAGE_TIMEOUT:-900}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT_DIR/apps/terminal-pro"
CMD=(npx electron-builder --linux AppImage deb --publish never)

echo "== Linux packaging =="
echo "timeout: ${TIMEOUT_SEC}s"
cd "$APP_DIR"

if command -v timeout >/dev/null 2>&1; then
  timeout --signal=TERM "$TIMEOUT_SEC" "${CMD[@]}"
  code=$?
  if [[ "$code" != "0" ]]; then
    if [[ "$code" == "124" ]]; then
      echo "❌ Linux packaging timed out after ${TIMEOUT_SEC}s"
      echo "   Re-run with a larger timeout:"
      echo "   LINUX_PACKAGE_TIMEOUT=1800 npm --workspace apps/terminal-pro run package:linux"
    fi
    exit "$code"
  fi
else
  "${CMD[@]}"
fi
