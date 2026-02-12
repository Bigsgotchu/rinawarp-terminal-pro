#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-}"
if [[ -z "$BASE_URL" ]]; then
  echo "Usage: ./verify-hosted-release.sh https://rinawarptech.com/downloads/v1.0.0"
  exit 2
fi

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing required tool: $1"; exit 2; }; }
need curl
need sha256sum
need gpg

FILES=(
  "rinawarp-terminal-pro_1.0.0_x86_64.AppImage"
  "rinawarp-terminal-pro_1.0.0_amd64.deb"
  "SHASUMS256.txt"
  "SHASUMS256.txt.asc"
  "RINAWARP_GPG_PUBLIC_KEY.asc"
)

TMP="$(mktemp -d)"
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

echo "Downloading to: $TMP"
cd "$TMP"

for f in "${FILES[@]}"; do
  echo "→ $f"
  curl -fL -O "${BASE_URL%/}/$f"
done

echo
echo "Importing public key..."
gpg --import RINAWARP_GPG_PUBLIC_KEY.asc >/dev/null 2>&1 || true

echo "Verifying SHASUMS signature..."
gpg --verify SHASUMS256.txt.asc SHASUMS256.txt

echo "Verifying checksums..."
sha256sum -c SHASUMS256.txt

echo
echo "✅ PASS: Hosted release verifies correctly."
