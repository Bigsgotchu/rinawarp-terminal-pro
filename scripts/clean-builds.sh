#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

rm -rf \
  "$repo_root/apps/terminal-pro/dist" \
  "$repo_root/apps/terminal-pro/dist-electron" \
  "$repo_root/apps/terminal-pro/out" \
  "$repo_root/apps/terminal-pro/.vite" \
  "$repo_root/apps/rinawarp-companion/dist" \
  "$repo_root/apps/rinawarp-companion"/*.vsix || true

find "$repo_root/packages" -maxdepth 2 -type d -name dist -prune -exec rm -rf {} + || true
