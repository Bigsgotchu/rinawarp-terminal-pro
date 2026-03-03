#!/bin/bash
# File: scripts/check-no-src-js.sh
# Prevents JS/CJS files from being added to src/ (TypeScript only)
set -euo pipefail

ROOT="${ROOT:-$(pwd)}"
TARGET="$ROOT/apps/terminal-pro/src"

if [[ ! -d "$TARGET" ]]; then
  echo "Directory not found: $TARGET"
  exit 1
fi

# Find JS/CJS files (excluding node-pty.d.ts which is a type declaration)
JS_FILES=$(find "$TARGET" -type f \( -name "*.js" -o -name "*.cjs" \) 2>/dev/null | grep -v "node-pty.d.ts" || true)

if [[ -n "$JS_FILES" ]]; then
  echo "❌ src/ contains JS/CJS files. Only TS allowed in src/ (preload is built to dist-electron/)."
  echo "$JS_FILES"
  exit 1
fi

echo "✅ No JS/CJS files in apps/terminal-pro/src"
