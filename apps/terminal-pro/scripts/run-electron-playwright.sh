#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)" == "Linux" ]] && command -v xvfb-run >/dev/null 2>&1; then
  CI="${CI:-1}" \
  ELECTRON_DISABLE_SANDBOX="${ELECTRON_DISABLE_SANDBOX:-1}" \
  xvfb-run -a npx playwright test "$@" -c tests/playwright.config.ts --reporter=line
  exit 0
fi

npx playwright test "$@" -c tests/playwright.config.ts --reporter=line
