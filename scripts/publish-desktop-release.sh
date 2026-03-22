#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT_DIR/apps/terminal-pro"
INSTALLER_DIR="$APP_DIR/dist-electron/installer"
VERSION="$(node -e "const fs=require('fs'); const pkg=JSON.parse(fs.readFileSync('$APP_DIR/package.json','utf8')); process.stdout.write(pkg.version)")"
PUBLIC_INSTALLERS_BUCKET="rinawarp-installers"

cd "$ROOT_DIR"

corepack pnpm --filter rinawarp-terminal-pro run release:metadata

linux_file="$INSTALLER_DIR/RinaWarp-Terminal-Pro-$VERSION.AppImage"
linux_deb_file="$INSTALLER_DIR/RinaWarp-Terminal-Pro-$VERSION.deb"
windows_file="$INSTALLER_DIR/RinaWarp-Terminal-Pro-$VERSION.exe"
windows_blockmap="$INSTALLER_DIR/RinaWarp-Terminal-Pro-$VERSION.exe.blockmap"
checksums_file="$INSTALLER_DIR/SHASUMS256.txt"

if [[ ! -f "$linux_file" ]]; then
  echo "[publish:desktop-release] Missing $linux_file" >&2
  exit 1
fi

if [[ ! -f "$windows_file" ]]; then
  echo "[publish:desktop-release] Missing $windows_file" >&2
  exit 1
fi

npx wrangler r2 object put "rinawarp-cdn/releases/$VERSION/RinaWarp-Terminal-Pro-$VERSION.AppImage" --file "$linux_file" --remote --content-type "application/vnd.appimage" --cache-control "public, max-age=31536000, immutable" --config website/wrangler.toml
npx wrangler r2 object put "$PUBLIC_INSTALLERS_BUCKET/releases/$VERSION/RinaWarp-Terminal-Pro-$VERSION.AppImage" --file "$linux_file" --remote --content-type "application/vnd.appimage" --cache-control "public, max-age=31536000, immutable" --config website/wrangler.toml

if [[ -f "$linux_deb_file" ]]; then
  npx wrangler r2 object put "rinawarp-cdn/releases/$VERSION/RinaWarp-Terminal-Pro-$VERSION.deb" --file "$linux_deb_file" --remote --content-type "application/vnd.debian.binary-package" --cache-control "public, max-age=31536000, immutable" --config website/wrangler.toml
  npx wrangler r2 object put "$PUBLIC_INSTALLERS_BUCKET/releases/$VERSION/RinaWarp-Terminal-Pro-$VERSION.deb" --file "$linux_deb_file" --remote --content-type "application/vnd.debian.binary-package" --cache-control "public, max-age=31536000, immutable" --config website/wrangler.toml
fi

npx wrangler r2 object put "rinawarp-cdn/releases/$VERSION/RinaWarp-Terminal-Pro-$VERSION.exe" --file "$windows_file" --remote --content-type "application/x-msdownload" --cache-control "public, max-age=31536000, immutable" --config website/wrangler.toml
npx wrangler r2 object put "$PUBLIC_INSTALLERS_BUCKET/releases/$VERSION/RinaWarp-Terminal-Pro-$VERSION.exe" --file "$windows_file" --remote --content-type "application/x-msdownload" --cache-control "public, max-age=31536000, immutable" --config website/wrangler.toml

if [[ -f "$windows_blockmap" ]]; then
  npx wrangler r2 object put "rinawarp-cdn/releases/$VERSION/RinaWarp-Terminal-Pro-$VERSION.exe.blockmap" --file "$windows_blockmap" --remote --content-type "application/octet-stream" --cache-control "public, max-age=31536000, immutable" --config website/wrangler.toml
  npx wrangler r2 object put "$PUBLIC_INSTALLERS_BUCKET/releases/$VERSION/RinaWarp-Terminal-Pro-$VERSION.exe.blockmap" --file "$windows_blockmap" --remote --content-type "application/octet-stream" --cache-control "public, max-age=31536000, immutable" --config website/wrangler.toml
fi

npx wrangler r2 object put "rinawarp-cdn/releases/$VERSION/SHASUMS256.txt" --file "$checksums_file" --remote --content-type "text/plain; charset=utf-8" --cache-control "public, max-age=31536000, immutable" --config website/wrangler.toml
npx wrangler r2 object put "$PUBLIC_INSTALLERS_BUCKET/releases/$VERSION/SHASUMS256.txt" --file "$checksums_file" --remote --content-type "text/plain; charset=utf-8" --cache-control "public, max-age=31536000, immutable" --config website/wrangler.toml

bash "$ROOT_DIR/scripts/publish-update-metadata.sh"

echo "[publish:desktop-release] Published RinaWarp Terminal Pro $VERSION"
