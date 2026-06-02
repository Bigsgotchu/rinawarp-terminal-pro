#!/usr/bin/env bash
set -euo pipefail

echo "🔍 Running release smoke checks..."

VERSION="$(node -p "require('./apps/terminal-pro/package.json').version")"
FOUND="$(find apps/terminal-pro -type f | grep "$VERSION" || true)"

if [[ -z "$FOUND" ]]; then
  echo "❌ No artifacts found for version $VERSION"
  exit 1
fi

echo "✅ Artifacts detected for version $VERSION"

# Check Linux artifacts
if ! find apps/terminal-pro -type f -name "*.AppImage" | grep -q .; then
  echo "⚠️ No Linux AppImage found (check packaging)"
else
  echo "✅ Linux AppImage found"
fi

if ! find apps/terminal-pro -type f -name "*.deb" | grep -q .; then
  echo "⚠️ No Linux deb found (check packaging)"
else
  echo "✅ Linux deb found"
fi

# Check Windows artifacts
if ! find apps/terminal-pro -type f -name "*.exe" | grep -q .; then
  echo "⚠️ No Windows installer found (check packaging)"
else
  echo "✅ Windows installer found"
fi

# Check macOS artifacts
if ! find apps/terminal-pro -type f -name "*.dmg" | grep -q .; then
  echo "⚠️ No macOS DMG found (check packaging)"
else
  echo "✅ macOS DMG found"
fi

if ! find apps/terminal-pro -type f -name "*.zip" | grep -q .; then
  echo "⚠️ No macOS ZIP found (check packaging)"
else
  echo "✅ macOS ZIP found"
fi

echo "✅ Smoke checks passed"