#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT_DIR/apps/terminal-pro"
INSTALLER_DIR="$APP_DIR/dist-electron/installer"
VERSION="$(node -e "const fs=require('fs'); const pkg=JSON.parse(fs.readFileSync('$APP_DIR/package.json','utf8')); process.stdout.write(pkg.version)")"
PUBLIC_INSTALLERS_BUCKET="rinawarp-installers"
ALLOW_DIRTY_RELEASE="${RINAWARP_ALLOW_DIRTY_RELEASE:-0}"

cd "$ROOT_DIR"

if command -v git >/dev/null 2>&1; then
  DIRTY_OUTPUT="$(
    git status --short --untracked-files=all -- \
      apps/terminal-pro/package.json \
      apps/terminal-pro/src \
      apps/terminal-pro/scripts \
      apps/terminal-pro/tests \
      apps/terminal-pro/test \
      packages \
      docs \
      scripts \
      website \
      package.json \
      tsconfig.json \
      2>/dev/null || true
  )"
  if [[ -n "$DIRTY_OUTPUT" && "$ALLOW_DIRTY_RELEASE" != "1" ]]; then
    echo "[publish:desktop-release] Refusing to publish v$VERSION from a dirty workspace." >&2
    echo "[publish:desktop-release] These changes may deserve a new version bump before release:" >&2
    echo "$DIRTY_OUTPUT" >&2
    echo "[publish:desktop-release] If you intentionally want to reuse this version, rerun with RINAWARP_ALLOW_DIRTY_RELEASE=1." >&2
    exit 1
  fi
fi

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

npx wrangler r2 object put "rinawarp-cdn/releases/$VERSION/RinaWarp-Terminal-Pro-$VERSION.AppImage" --file "$linux_file" --remote --content-type "application/vnd.appimage" --cache-control "public, max-age=31536000, immutable" --config website/wrangler.toml
npx wrangler r2 object put "$PUBLIC_INSTALLERS_BUCKET/releases/$VERSION/RinaWarp-Terminal-Pro-$VERSION.AppImage" --file "$linux_file" --remote --content-type "application/vnd.appimage" --cache-control "public, max-age=31536000, immutable" --config website/wrangler.toml

if [[ -f "$linux_deb_file" ]]; then
  npx wrangler r2 object put "rinawarp-cdn/releases/$VERSION/RinaWarp-Terminal-Pro-$VERSION.deb" --file "$linux_deb_file" --remote --content-type "application/vnd.debian.binary-package" --cache-control "public, max-age=31536000, immutable" --config website/wrangler.toml
  npx wrangler r2 object put "$PUBLIC_INSTALLERS_BUCKET/releases/$VERSION/RinaWarp-Terminal-Pro-$VERSION.deb" --file "$linux_deb_file" --remote --content-type "application/vnd.debian.binary-package" --cache-control "public, max-age=31536000, immutable" --config website/wrangler.toml
fi

if [[ -f "$windows_file" ]]; then
  npx wrangler r2 object put "rinawarp-cdn/releases/$VERSION/RinaWarp-Terminal-Pro-$VERSION.exe" --file "$windows_file" --remote --content-type "application/x-msdownload" --cache-control "public, max-age=31536000, immutable" --config website/wrangler.toml
  npx wrangler r2 object put "$PUBLIC_INSTALLERS_BUCKET/releases/$VERSION/RinaWarp-Terminal-Pro-$VERSION.exe" --file "$windows_file" --remote --content-type "application/x-msdownload" --cache-control "public, max-age=31536000, immutable" --config website/wrangler.toml

  if [[ -f "$windows_blockmap" ]]; then
    npx wrangler r2 object put "rinawarp-cdn/releases/$VERSION/RinaWarp-Terminal-Pro-$VERSION.exe.blockmap" --file "$windows_blockmap" --remote --content-type "application/octet-stream" --cache-control "public, max-age=31536000, immutable" --config website/wrangler.toml
    npx wrangler r2 object put "$PUBLIC_INSTALLERS_BUCKET/releases/$VERSION/RinaWarp-Terminal-Pro-$VERSION.exe.blockmap" --file "$windows_blockmap" --remote --content-type "application/octet-stream" --cache-control "public, max-age=31536000, immutable" --config website/wrangler.toml
  fi
else
  echo "[publish:desktop-release] No Windows installer for v$VERSION on this host; preserving previous Windows download metadata."
fi

npx wrangler r2 object put "rinawarp-cdn/releases/$VERSION/SHASUMS256.txt" --file "$checksums_file" --remote --content-type "text/plain; charset=utf-8" --cache-control "public, max-age=31536000, immutable" --config website/wrangler.toml
npx wrangler r2 object put "$PUBLIC_INSTALLERS_BUCKET/releases/$VERSION/SHASUMS256.txt" --file "$checksums_file" --remote --content-type "text/plain; charset=utf-8" --cache-control "public, max-age=31536000, immutable" --config website/wrangler.toml

bash "$ROOT_DIR/scripts/publish-update-metadata.sh"

echo "[publish:desktop-release] Published RinaWarp Terminal Pro $VERSION"
