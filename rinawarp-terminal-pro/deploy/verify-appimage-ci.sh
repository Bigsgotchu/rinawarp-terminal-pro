#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VER="${VER:-$(node -e 'const fs=require("fs");const p=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(p.version);' "$ROOT_DIR/apps/terminal-pro/package.json")}"
RELEASE_DIR="${RELEASE_DIR:-$ROOT_DIR/release/v$VER}"
APPIMAGE="${APPIMAGE:-$RELEASE_DIR/RinaWarp-Terminal-Pro-$VER.AppImage}"
SHASUMS="${SHASUMS:-$RELEASE_DIR/SHASUMS256.txt}"
RUN_E2E="${RUN_E2E:-1}"

if [[ ! -f "$APPIMAGE" ]]; then
  echo "❌ AppImage not found: $APPIMAGE"
  exit 1
fi

if [[ ! -f "$SHASUMS" ]]; then
  echo "❌ SHASUMS file not found: $SHASUMS"
  exit 1
fi

if ! command -v sha256sum >/dev/null 2>&1; then
  echo "❌ sha256sum is required"
  exit 1
fi

APP_BASENAME="$(basename "$APPIMAGE")"
EXPECTED="$(awk -v f="$APP_BASENAME" '$2==f {print $1}' "$SHASUMS" | head -n1)"
if [[ -z "$EXPECTED" ]]; then
  echo "❌ Could not find checksum entry for $APP_BASENAME in $SHASUMS"
  exit 1
fi

ACTUAL="$(sha256sum "$APPIMAGE" | awk '{print $1}')"
if [[ "$ACTUAL" != "$EXPECTED" ]]; then
  echo "❌ SHA256 mismatch for $APP_BASENAME"
  echo "expected: $EXPECTED"
  echo "actual:   $ACTUAL"
  exit 1
fi
echo "✅ SHA256 verified: $APP_BASENAME"

WORK_DIR="$(mktemp -d /tmp/rinawarp-appimage-verify-XXXXXX)"
trap 'rm -rf "$WORK_DIR"' EXIT
cp "$APPIMAGE" "$WORK_DIR/$APP_BASENAME"
chmod +x "$WORK_DIR/$APP_BASENAME"

pushd "$WORK_DIR" >/dev/null
"./$APP_BASENAME" --appimage-extract >/dev/null

if [[ ! -d "squashfs-root" ]]; then
  echo "❌ Extraction failed: squashfs-root missing"
  exit 1
fi

test -x "squashfs-root/AppRun" || { echo "❌ Missing executable AppRun"; exit 1; }
test -x "squashfs-root/rinawarp-terminal-pro" || { echo "❌ Missing executable binary"; exit 1; }
test -f "squashfs-root/resources/app.asar" || { echo "❌ Missing resources/app.asar"; exit 1; }
echo "✅ AppImage payload structure verified"
popd >/dev/null

if [[ "$RUN_E2E" == "1" ]]; then
  if ! command -v xvfb-run >/dev/null 2>&1; then
    echo "❌ xvfb-run is required for CI smoke tests"
    exit 1
  fi
  pushd "$ROOT_DIR" >/dev/null
  npm --workspace apps/terminal-pro run build:electron
  CI=1 ELECTRON_DISABLE_SANDBOX=1 xvfb-run -a npm --workspace apps/terminal-pro run e2e:smoke
  popd >/dev/null
  echo "✅ CI-safe Electron e2e smoke passed"
fi

echo "✅ AppImage CI verification passed for v$VER"
