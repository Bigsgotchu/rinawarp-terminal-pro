#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT_DIR/apps/terminal-pro"

echo "== Agent parity gates =="
echo "Running focused E2E gates: agent + palette + settings"

cd "$APP_DIR"
npx playwright test -c tests/playwright.config.ts \
  tests/e2e/agent-mode.spec.ts \
  tests/e2e/palette.spec.ts \
  tests/e2e/settings.spec.ts \
  --workers=1

echo "✅ Agent parity gates passed"
