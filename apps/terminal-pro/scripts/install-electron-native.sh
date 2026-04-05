#!/usr/bin/env bash
set -euo pipefail

app_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$app_root"

electron_version="$(node -e "console.log(JSON.parse(require('node:fs').readFileSync(require.resolve('electron/package.json'),'utf8')).version)")"
cache_root="${RINAWARP_ELECTRON_GYP_CACHE:-$app_root/.native-cache/electron-gyp}"
headers_root="$cache_root/$electron_version"
headers_tarball="$cache_root/node-v$electron_version-headers.tar.gz"
headers_url="${RINAWARP_ELECTRON_HEADERS_URL:-https://www.electronjs.org/headers/v$electron_version/node-v$electron_version-headers.tar.gz}"
provided_headers_tarball="${RINAWARP_ELECTRON_HEADERS_TARBALL:-}"
module_dir="$(node -p "require('node:path').dirname(require.resolve('better-sqlite3/package.json'))")"

mkdir -p "$cache_root"

if [[ -n "$provided_headers_tarball" && "$provided_headers_tarball" != "$headers_tarball" ]]; then
  echo "[native] Using predownloaded Electron headers tarball: $provided_headers_tarball"
  cp "$provided_headers_tarball" "$headers_tarball"
elif [[ ! -f "$headers_tarball" ]]; then
  echo "[native] Downloading Electron headers for $electron_version"
  curl -fsSL "$headers_url" -o "$headers_tarball"
fi

install_version_file="$headers_root/installVersion"
if [[ ! -f "$install_version_file" ]]; then
  echo "[native] Preparing Electron header cache for $electron_version"
  npx node-gyp install \
    --target="$electron_version" \
    --dist-url=https://electronjs.org/headers \
    --devdir="$cache_root" \
    --tarball="$headers_tarball"
fi

echo "[native] Rebuilding better-sqlite3 for Electron $electron_version"
(
  cd "$module_dir"
  npx node-gyp rebuild \
    --release \
    --runtime=electron \
    --target="$electron_version" \
    --dist-url=https://electronjs.org/headers \
    --devdir="$cache_root"
)

echo "[native] better-sqlite3 ready for Electron $electron_version"
