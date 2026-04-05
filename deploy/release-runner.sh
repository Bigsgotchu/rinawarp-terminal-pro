#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[release] RinaWarp desktop release runner"
echo "[release] This script packages the current host platform."
echo "[release] Full multi-platform publishing remains in .github/workflows/release.yml"

platform="$(uname -s)"
case "$platform" in
  Linux*)
    target_script=""
    target_label="linux-appimage"
    ;;
  Darwin*)
    target_script="dist:mac"
    target_label="$target_script"
    ;;
  MINGW*|MSYS*|CYGWIN*)
    target_script="dist:win"
    target_label="$target_script"
    ;;
  *)
    echo "[release] Unsupported platform: $platform" >&2
    exit 1
    ;;
esac

echo "[release] Building Electron app"
npm --prefix apps/terminal-pro run build:electron
echo "[release] Rebuilding Electron native dependencies"
npm --prefix apps/terminal-pro run install:electron-native

if [[ "$platform" == Linux* ]]; then
  echo "[release] Packaging via apps/terminal-pro:$target_label"
  npx pnpm --dir apps/terminal-pro exec electron-builder --linux AppImage --publish never
  echo "[release] Refreshing updater metadata"
  npm --prefix apps/terminal-pro run release:metadata
  bash deploy/verify-appimage-ci.sh
else
  echo "[release] Packaging via apps/terminal-pro:$target_label"
  npm --prefix apps/terminal-pro run "$target_script"
fi

echo "[release] Done"
echo "[release] Artifacts should be under apps/terminal-pro/dist-electron/installer"
