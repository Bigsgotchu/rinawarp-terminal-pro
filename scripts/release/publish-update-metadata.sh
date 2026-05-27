#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

cd "$ROOT_DIR"

corepack pnpm --filter rinawarp-terminal-pro run release:metadata

echo "[publish:update-metadata] R2 publishing is frozen. Updater metadata is published with npm run release:publish:desktop via GitHub Releases."
