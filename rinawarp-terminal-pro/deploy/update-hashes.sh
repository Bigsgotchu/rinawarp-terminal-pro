#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VER="${VER:-$(node -e 'const fs=require("fs");const p=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(p.version);' "$ROOT_DIR/apps/terminal-pro/package.json")}"
DIST_DIR="${DIST_DIR:-apps/terminal-pro/dist}"
WEB_ROOT="${WEB_ROOT:-rinawarptech-website/web}"
RELEASE_DIR="${RELEASE_DIR:-release/v$VER}"

APPIMAGE="RinaWarp-Terminal-Pro-$VER.AppImage"
DEB="RinaWarp-Terminal-Pro-$VER.amd64.deb"
EXE="RinaWarp-Terminal-Pro-$VER.exe"

sha256() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    shasum -a 256 "$1" | awk '{print $1}'
  fi
}

for file in "$APPIMAGE" "$DEB" "$EXE"; do
  if [[ ! -f "$DIST_DIR/$file" ]]; then
    echo "❌ Missing artifact: $DIST_DIR/$file"
    exit 1
  fi
done

mkdir -p "$RELEASE_DIR"
cp -f "$DIST_DIR/$APPIMAGE" "$RELEASE_DIR/$APPIMAGE"
cp -f "$DIST_DIR/$DEB" "$RELEASE_DIR/$DEB"
cp -f "$DIST_DIR/$EXE" "$RELEASE_DIR/$EXE"

sha_appimage="$(sha256 "$DIST_DIR/$APPIMAGE")"
sha_deb="$(sha256 "$DIST_DIR/$DEB")"
sha_exe="$(sha256 "$DIST_DIR/$EXE")"

cat > "$RELEASE_DIR/SHASUMS256.txt" <<EOF
$sha_appimage  $APPIMAGE
$sha_deb  $DEB
$sha_exe  $EXE
EOF

mkdir -p "$WEB_ROOT/downloads/terminal-pro"
cp -f "$RELEASE_DIR/SHASUMS256.txt" "$WEB_ROOT/downloads/terminal-pro/SHA256SUMS.txt"

manifest="$WEB_ROOT/releases/v$VER.json"
if [[ ! -f "$manifest" ]]; then
  echo "❌ Missing manifest: $manifest"
  exit 1
fi

node -e '
const fs = require("fs");
const manifestPath = process.argv[1];
const shaAppImage = process.argv[2];
const shaDeb = process.argv[3];
const shaExe = process.argv[4];
const json = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
json.downloads = json.downloads || {};
json.downloads.linuxAppImage = json.downloads.linuxAppImage || {};
json.downloads.linuxDeb = json.downloads.linuxDeb || {};
json.downloads.windowsExe = json.downloads.windowsExe || {};
json.downloads.linuxAppImage.sha256 = shaAppImage;
json.downloads.linuxDeb.sha256 = shaDeb;
json.downloads.windowsExe.sha256 = shaExe;
fs.writeFileSync(manifestPath, JSON.stringify(json, null, 2) + "\n");
' "$manifest" "$sha_appimage" "$sha_deb" "$sha_exe"

mkdir -p "rinawarptech-website/releases"
cp -f "$manifest" "rinawarptech-website/releases/v$VER.json"

echo "✅ Updated release metadata"
echo "   Manifest: $manifest"
echo "   Checksums: $RELEASE_DIR/SHASUMS256.txt"
echo "   Site checksums: $WEB_ROOT/downloads/terminal-pro/SHA256SUMS.txt"
