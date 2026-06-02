#!/usr/bin/env bash
set -euo pipefail

echo "📦 Building Linux packages..."
cd "$(dirname "${BASH_SOURCE[0]}")/../apps/terminal-pro"

# Build with electron-builder using Linux target
npx electron-builder --linux --publish never