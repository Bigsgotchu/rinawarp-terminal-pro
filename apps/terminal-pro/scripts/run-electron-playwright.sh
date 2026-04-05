#!/usr/bin/env bash
set -euo pipefail

needs_packaged_build=0
for arg in "$@"; do
  case "$arg" in
    *packaged-first-run.spec.ts*|*release-golden-journeys.spec.ts*)
      needs_packaged_build=1
      ;;
  esac
done

if [[ "$needs_packaged_build" == "1" ]]; then
  app_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  packaged_asar="$app_root/dist-electron/installer/linux-unpacked/resources/app.asar"
  built_main="$app_root/dist-electron/main.js"
  if [[ ! -f "$packaged_asar" || ! -f "$built_main" || "$built_main" -nt "$packaged_asar" ]]; then
    echo "[E2E boot] packaged artifact missing or stale; rebuilding linux-unpacked"
    (cd "$app_root" && npx electron-builder --linux dir --publish never)
  fi
fi

if [[ "$(uname -s)" == "Linux" ]] && command -v xvfb-run >/dev/null 2>&1; then
  env -u ELECTRON_RUN_AS_NODE \
    CI="${CI:-1}" \
    ELECTRON_DISABLE_SANDBOX="${ELECTRON_DISABLE_SANDBOX:-1}" \
    xvfb-run -a npx playwright test "$@" -c tests/playwright.config.ts --reporter=line
  exit 0
fi

env -u ELECTRON_RUN_AS_NODE npx playwright test "$@" -c tests/playwright.config.ts --reporter=line
