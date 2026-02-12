#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VER="${VER:-$(node -e 'const fs=require("fs");const p=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(p.version);' "$ROOT_DIR/apps/terminal-pro/package.json")}"
DIST_DIR="${DIST_DIR:-apps/terminal-pro/dist}"

canonical_exe="$DIST_DIR/RinaWarp-Terminal-Pro-$VER.exe"
canonical_appimage="$DIST_DIR/RinaWarp-Terminal-Pro-$VER.AppImage"
canonical_deb="$DIST_DIR/RinaWarp-Terminal-Pro-$VER.amd64.deb"

find_windows_exe() {
  local direct="$DIST_DIR/RinaWarp Terminal Pro Setup $VER.exe"
  if [[ -f "$direct" ]]; then
    echo "$direct"
    return 0
  fi
  local found
  found="$(find "$DIST_DIR" -maxdepth 1 -type f -name "*.exe" ! -name "*.blockmap" | head -1)"
  if [[ -n "${found:-}" ]]; then
    echo "$found"
    return 0
  fi
  return 1
}

find_deb_file() {
  local direct="$DIST_DIR/RinaWarp-Terminal-Pro-$VER.deb"
  if [[ -f "$direct" ]]; then
    echo "$direct"
    return 0
  fi
  local found
  found="$(find "$DIST_DIR" -maxdepth 1 -type f -name "*.deb" | head -1)"
  if [[ -n "${found:-}" ]]; then
    echo "$found"
    return 0
  fi
  return 1
}

if [[ ! -f "$canonical_appimage" ]]; then
  echo "❌ Missing AppImage: $canonical_appimage"
  exit 1
fi

if ! src_exe="$(find_windows_exe)"; then
  echo "❌ Could not find Windows installer .exe in $DIST_DIR"
  exit 1
fi
if [[ "$src_exe" != "$canonical_exe" ]]; then
  cp -f "$src_exe" "$canonical_exe"
fi

if ! src_deb="$(find_deb_file)"; then
  echo "❌ Could not find Debian installer .deb in $DIST_DIR"
  exit 1
fi
if [[ "$src_deb" != "$canonical_deb" ]]; then
  cp -f "$src_deb" "$canonical_deb"
fi

echo "✅ Normalized artifacts:"
echo "   $canonical_exe"
echo "   $canonical_appimage"
echo "   $canonical_deb"
