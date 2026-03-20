#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Renderer/workbench must not use innerHTML (store-only)
rg -n --hidden --glob '!**/dist/**' --glob '!**/build/**' \
  "innerHTML\s*=|insertAdjacentHTML|outerHTML" \
  "$ROOT/apps/terminal-pro/src/renderer/workbench" && {
    echo "FAIL: innerHTML in canonical workbench renderer"
    exit 1
  } || true

# Main execution must not use process.cwd() except allowlisted modules
rg -n --hidden --glob '!**/dist/**' --glob '!**/build/**' \
  "process\.cwd\(\)" \
  "$ROOT/apps/terminal-pro/src" \
  --glob '!apps/terminal-pro/src/main/workspace/**' \
  --glob '!apps/terminal-pro/src/main/execution/**' && {
    echo "FAIL: process.cwd() used outside allowlisted modules"
    exit 1
  } || true

# Prevent direct child_process usage outside blessed executor (scoped to src/main/)
rg -n --hidden --glob '!**/dist/**' --glob '!**/build/**' \
  "(from\s+['\"]child_process['\"]|require\(['\"]child_process['\"]\))" \
  "$ROOT/apps/terminal-pro/src/main" \
  --glob '!apps/terminal-pro/src/main/execution/**' \
  --glob '!apps/terminal-pro/src/main/pty/**' && {
    echo "FAIL: child_process imported outside main/execution or pty"
    exit 1
  } || true

echo "guards OK"
