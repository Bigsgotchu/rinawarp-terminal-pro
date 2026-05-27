#!/usr/bin/env bash
set -euo pipefail

app_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

normalized_args=()
needs_packaged_build=0
for arg in "$@"; do
  if [[ "$arg" == --* ]]; then
    normalized_args+=("$arg")
    continue
  fi

  normalized_arg="$arg"
  normalized_arg="${normalized_arg#apps/terminal-pro/tests/e2e/}"
  normalized_arg="${normalized_arg#tests/e2e/}"
  normalized_arg="${normalized_arg#e2e/}"
  normalized_arg="$(basename "$normalized_arg")"
  normalized_args+=("$normalized_arg")

  case "$arg" in
    *packaged-first-run.spec.ts*|*release-golden-journeys.spec.ts*)
      needs_packaged_build=1
      ;;
  esac
done

if [[ "$needs_packaged_build" == "1" ]]; then
  packaged_asar="$app_root/dist-electron/installer/linux-unpacked/resources/app.asar"
  built_main="$app_root/dist-electron/main.js"
  if [[ ! -f "$packaged_asar" || ! -f "$built_main" || "$built_main" -nt "$packaged_asar" ]]; then
    echo "[E2E boot] packaged artifact missing or stale; rebuilding linux-unpacked"
    (cd "$app_root" && npm run install:electron-native && npx electron-builder --linux dir --publish never)
  fi
fi

cd "$app_root"

playwright_config="${PLAYWRIGHT_CONFIG:-tests/playwright.config.ts}"
playwright_args=("${normalized_args[@]}")
if [[ "${#playwright_args[@]}" -eq 0 ]]; then
  playwright_args=(tests/e2e)
fi

if [[ "$(uname -s)" == "Linux" ]] && command -v xvfb-run >/dev/null 2>&1; then
  xvfb-run -a env -u ELECTRON_RUN_AS_NODE \
    CI="${CI:-1}" \
    RINAWARP_E2E="${RINAWARP_E2E:-1}" \
    ELECTRON_DISABLE_SANDBOX="${ELECTRON_DISABLE_SANDBOX:-1}" \
    npx playwright test "${playwright_args[@]}" -c "$playwright_config" --reporter=line
  exit 0
fi

env -u ELECTRON_RUN_AS_NODE \
  CI="${CI:-1}" \
  RINAWARP_E2E="${RINAWARP_E2E:-1}" \
  ELECTRON_DISABLE_SANDBOX="${ELECTRON_DISABLE_SANDBOX:-1}" \
  npx playwright test "${playwright_args[@]}" -c "$playwright_config" --reporter=line
