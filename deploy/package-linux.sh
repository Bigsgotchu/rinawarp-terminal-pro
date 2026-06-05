#!/usr/bin/env bash
set -euo pipefail

echo "📦 Building Linux packages..."
cd "$(dirname "${BASH_SOURCE[0]}")/../apps/terminal-pro"

echo "🔧 Rebuilding Electron native dependencies..."
npm run install:electron-native

# Build with electron-builder using Linux target
npx electron-builder --linux --publish never
