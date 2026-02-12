#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

VERSION="${1:-${VERSION:-}}"
if [[ -z "$VERSION" ]]; then
  echo "Usage: bash deploy/bump-release-version.sh <version>"
  echo "Example: bash deploy/bump-release-version.sh 1.0.1"
  exit 1
fi

if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "❌ Invalid version format: $VERSION (expected x.y.z)"
  exit 1
fi

APP_PKG="$ROOT_DIR/apps/terminal-pro/package.json"
WEB_RELEASES="$ROOT_DIR/rinawarptech-website/web/releases"
ROOT_RELEASES="$ROOT_DIR/rinawarptech-website/releases"
PREV_FILE="$WEB_RELEASES/v$(node -e 'const p=require(process.argv[1]);process.stdout.write(p.version);' "$APP_PKG").json"
NEW_FILE="$WEB_RELEASES/v$VERSION.json"

node -e '
const fs = require("fs");
const pkgPath = process.argv[1];
const version = process.argv[2];
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
pkg.version = version;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
' "$APP_PKG" "$VERSION"

if [[ -f "$PREV_FILE" ]]; then
  cp -f "$PREV_FILE" "$NEW_FILE"
else
  cat > "$NEW_FILE" <<JSON
{
  "version": "$VERSION",
  "releasedAt": "$(date -u +%Y-%m-%d)",
  "downloads": {
    "linuxAppImage": {
      "file": "RinaWarp-Terminal-Pro-$VERSION.AppImage",
      "sha256": ""
    },
    "linuxDeb": {
      "file": "RinaWarp-Terminal-Pro-$VERSION.amd64.deb",
      "sha256": ""
    },
    "windowsExe": {
      "file": "RinaWarp-Terminal-Pro-$VERSION.exe",
      "sha256": ""
    }
  }
}
JSON
fi

node -e '
const fs = require("fs");
const p = process.argv[1];
const version = process.argv[2];
const j = JSON.parse(fs.readFileSync(p, "utf8"));
j.version = version;
j.releasedAt = new Date().toISOString().slice(0, 10);
if (j.downloads?.linuxAppImage) j.downloads.linuxAppImage.file = `RinaWarp-Terminal-Pro-${version}.AppImage`;
if (j.downloads?.linuxDeb) j.downloads.linuxDeb.file = `RinaWarp-Terminal-Pro-${version}.amd64.deb`;
if (j.downloads?.windowsExe) j.downloads.windowsExe.file = `RinaWarp-Terminal-Pro-${version}.exe`;
fs.writeFileSync(p, JSON.stringify(j, null, 2) + "\n");
' "$NEW_FILE" "$VERSION"

mkdir -p "$ROOT_RELEASES"
cp -f "$NEW_FILE" "$ROOT_RELEASES/v$VERSION.json"

mkdir -p "$ROOT_DIR/release/v$VERSION"
echo "✅ Version bumped to $VERSION"
echo "   Updated: apps/terminal-pro/package.json"
echo "   Created: rinawarptech-website/web/releases/v$VERSION.json"
echo "   Copied : rinawarptech-website/releases/v$VERSION.json"
echo "   Created: release/v$VERSION/"
