#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

artifact=""
checksums=""

if compgen -G "apps/terminal-pro/dist-electron/installer/*.AppImage" > /dev/null; then
  artifact="$(ls -t apps/terminal-pro/dist-electron/installer/*.AppImage | head -n 1)"
fi

if [[ -z "$artifact" ]] && compgen -G "release/v*/RinaWarp-Terminal-Pro-*.AppImage" > /dev/null; then
  artifact="$(ls -t release/v*/RinaWarp-Terminal-Pro-*.AppImage | head -n 1)"
fi

if [[ -z "$artifact" ]]; then
  echo "[verify-appimage] No AppImage artifact found" >&2
  exit 1
fi

release_dir="$(dirname "$artifact")"
if [[ -f "$release_dir/SHASUMS256.txt" ]]; then
  checksums="$release_dir/SHASUMS256.txt"
fi

echo "[verify-appimage] Artifact: $artifact"
if [[ -n "$checksums" ]]; then
  echo "[verify-appimage] Using checksums: $checksums"
  (
    cd "$(dirname "$checksums")"
    sha256sum -c "$(basename "$checksums")" --ignore-missing
  )
else
  echo "[verify-appimage] No SHASUMS256.txt found next to artifact; skipping checksum validation"
fi

test -x "$artifact" || chmod +x "$artifact"
echo "[verify-appimage] AppImage exists and is executable"
