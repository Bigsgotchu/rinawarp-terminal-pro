#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VER="${VER:-$(node -e 'const fs=require("fs");const p=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(p.version);' "$ROOT_DIR/apps/terminal-pro/package.json")}"
RELEASE_DIR="${RELEASE_DIR:-$ROOT_DIR/release/v$VER}"
SIGNING_KEY="${SIGNING_KEY:-9655B53A0B3E6FA4}"

SHASUMS="$RELEASE_DIR/SHASUMS256.txt"
SIGNATURE="$RELEASE_DIR/SHASUMS256.txt.asc"
PUBKEY="$RELEASE_DIR/RINAWARP_GPG_PUBLIC_KEY.asc"

if [[ ! -f "$SHASUMS" ]]; then
  echo "❌ Missing checksums file: $SHASUMS"
  exit 1
fi

if ! command -v gpg >/dev/null 2>&1; then
  echo "❌ gpg is required to sign release metadata."
  exit 1
fi

gpg --batch --yes --armor --local-user "$SIGNING_KEY" --output "$SIGNATURE" --detach-sign "$SHASUMS"
gpg --batch --yes --armor --export "$SIGNING_KEY" > "$PUBKEY"

echo "✅ Signed SHASUMS with key $SIGNING_KEY"
echo "   $SIGNATURE"
echo "   $PUBKEY"
