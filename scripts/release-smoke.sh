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

if ! find apps/terminal-pro -type f -name "*.AppImage" | grep -q .; then
  echo "⚠️ No Linux AppImage found (check packaging)"
fi

echo "✅ Smoke checks passed"
