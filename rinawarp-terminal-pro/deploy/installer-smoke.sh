#!/usr/bin/env bash
set -euo pipefail
trap 'echo "❌ installer-smoke failed at line $LINENO"; exit 1' ERR

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VER="${VER:-$(node -e 'const fs=require("fs");const p=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(p.version);' "$ROOT_DIR/apps/terminal-pro/package.json")}"
DIST_DIR="${DIST_DIR:-apps/terminal-pro/dist}"

APPIMAGE="$DIST_DIR/RinaWarp-Terminal-Pro-$VER.AppImage"
DEB="$DIST_DIR/RinaWarp-Terminal-Pro-$VER.amd64.deb"
EXE="$DIST_DIR/RinaWarp-Terminal-Pro-$VER.exe"

check_exists() {
  local f="$1"
  test -f "$f" || { echo "❌ Missing artifact: $f"; exit 1; }
}

check_size() {
  local f="$1"
  local min_bytes="$2"
  local size
  size="$(stat -c '%s' "$f")"
  if (( size < min_bytes )); then
    echo "❌ Artifact too small: $f ($size bytes)"
    exit 1
  fi
  echo "✅ Size ok: $f ($size bytes)"
}

check_not_html() {
  local f="$1"
  local mime
  mime="$(file -b --mime-type "$f" || true)"
  if [[ "$mime" == "text/html" ]]; then
    echo "❌ Artifact is HTML, expected binary: $f"
    exit 1
  fi
  echo "✅ MIME ok: $f ($mime)"
}

check_exe_magic() {
  local f="$1"
  local magic
  magic="$(xxd -p -l 2 "$f" | tr -d '\n' | tr '[:lower:]' '[:upper:]')"
  [[ "$magic" == "4D5A" ]] || { echo "❌ Invalid EXE magic for $f"; exit 1; }
  echo "✅ EXE magic ok: $f"
}

check_appimage_magic() {
  local f="$1"
  local magic
  magic="$(xxd -p -l 4 "$f" | tr -d '\n' | tr '[:lower:]' '[:upper:]')"
  [[ "$magic" == "7F454C46" ]] || { echo "❌ Invalid ELF/AppImage magic for $f"; exit 1; }
  echo "✅ AppImage magic ok: $f"
}

check_deb_archive() {
  local f="$1"
  if command -v dpkg-deb >/dev/null 2>&1; then
    dpkg-deb --info "$f" >/dev/null
  else
    ar t "$f" >/dev/null
  fi
  echo "✅ Debian package structure ok: $f"
}

echo "== Installer smoke =="
echo "Version : $VER"
echo "Dist dir: $DIST_DIR"

check_exists "$APPIMAGE"
check_exists "$DEB"
check_exists "$EXE"

check_size "$APPIMAGE" 1000000
check_size "$DEB" 1000000
check_size "$EXE" 1000000

check_not_html "$APPIMAGE"
check_not_html "$DEB"
check_not_html "$EXE"

check_appimage_magic "$APPIMAGE"
check_deb_archive "$DEB"
check_exe_magic "$EXE"

echo "✅ Installer smoke passed"
