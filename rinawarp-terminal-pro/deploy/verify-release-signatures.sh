#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VER="${VER:-$(node -e 'const fs=require("fs");const p=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(p.version);' "$ROOT_DIR/apps/terminal-pro/package.json")}"
RELEASE_DIR="${RELEASE_DIR:-$ROOT_DIR/release/v$VER}"

SHASUMS="$RELEASE_DIR/SHASUMS256.txt"
SIGNATURE="$RELEASE_DIR/SHASUMS256.txt.asc"
PUBKEY="$RELEASE_DIR/RINAWARP_GPG_PUBLIC_KEY.asc"

APPIMAGE="$RELEASE_DIR/RinaWarp-Terminal-Pro-$VER.AppImage"
DEB="$RELEASE_DIR/RinaWarp-Terminal-Pro-$VER.amd64.deb"
EXE="$RELEASE_DIR/RinaWarp-Terminal-Pro-$VER.exe"

for f in "$SHASUMS" "$SIGNATURE" "$PUBKEY" "$APPIMAGE" "$DEB" "$EXE"; do
  if [[ ! -f "$f" ]]; then
    echo "❌ Missing required release signing file: $f"
    exit 1
  fi
done

if ! command -v gpg >/dev/null 2>&1; then
  echo "❌ gpg is required for signature verification."
  exit 1
fi

if ! command -v sha256sum >/dev/null 2>&1; then
  echo "❌ sha256sum is required for checksum verification."
  exit 1
fi

GNUPGHOME="$(mktemp -d)"
export GNUPGHOME
trap 'rm -rf "$GNUPGHOME"' EXIT

gpg --batch --import "$PUBKEY" >/dev/null 2>&1
gpg --batch --verify "$SIGNATURE" "$SHASUMS" >/dev/null 2>&1

(
  cd "$RELEASE_DIR"
  sha256sum -c "SHASUMS256.txt"
) >/dev/null

echo "✅ Signature and checksums verified for v$VER"
