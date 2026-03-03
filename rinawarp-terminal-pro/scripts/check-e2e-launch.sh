#!/usr/bin/env bash
set -euo pipefail

if rg -n "_electron as electron|electron\\.launch\\(" apps/terminal-pro/tests/e2e --glob "*.spec.ts" >/dev/null; then
  echo "Use launchApp()/withApp from apps/terminal-pro/tests/e2e/_launch.ts and _app.ts instead of direct electron.launch()."
  rg -n "_electron as electron|electron\\.launch\\(" apps/terminal-pro/tests/e2e --glob "*.spec.ts"
  exit 1
fi

echo "E2E launch check passed."
