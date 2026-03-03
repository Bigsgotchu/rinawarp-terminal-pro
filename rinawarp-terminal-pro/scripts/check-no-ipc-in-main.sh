#!/usr/bin/env bash
#
# check-no-ipc-in-main.sh
#
# Bans ipcMain.handle() and ipcMain.on() calls in main.ts.
# All IPC handlers should be in src/main/** modules and registered
# via registerAllIpc().
#
# Usage: ./scripts/check-no-ipc-in-main.sh

set -euo pipefail

FILE="apps/terminal-pro/src/main.ts"

if [ ! -f "$FILE" ]; then
  echo "❌ File not found: $FILE"
  exit 1
fi

# Check for ipcMain.handle
if grep -n "ipcMain\.handle(" "$FILE" >/dev/null 2>&1; then
  echo "❌ ipcMain.handle() found in $FILE"
  echo ""
  echo "Move handlers into apps/terminal-pro/src/main/** modules and register via registerAllIpc()."
  echo ""
  echo "Found at:"
  grep -n "ipcMain\.handle(" "$FILE"
  exit 1
fi

# Check for ipcMain.on
if grep -n "ipcMain\.on(" "$FILE" >/dev/null 2>&1; then
  echo "❌ ipcMain.on() found in $FILE"
  echo ""
  echo "Move handlers into apps/terminal-pro/src/main/** modules and register via registerAllIpc()."
  echo ""
  echo "Found at:"
  grep -n "ipcMain\.on(" "$FILE"
  exit 1
fi

echo "✅ No ipcMain.handle() or ipcMain.on() in main.ts"
