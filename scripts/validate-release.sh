#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:-}"

if [[ -z "$VERSION" ]]; then
  echo "❌ Missing version argument"
  exit 1
fi

echo "🔍 Validating release for version: $VERSION"

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "❌ Dirty workspace — refusing release"
  git status --short
  exit 1
fi

PKG_VERSION="$(node -p "require('./apps/terminal-pro/package.json').version")"
ROOT_VERSION="$(node -p "require('./package.json').version")"
if [[ "$PKG_VERSION" != "$VERSION" && "v$PKG_VERSION" != "$VERSION" ]]; then
  echo "❌ Version mismatch"
  echo "apps/terminal-pro/package.json: $PKG_VERSION"
  echo "requested: $VERSION"
  exit 1
fi

if [[ "$ROOT_VERSION" != "$VERSION" && "v$ROOT_VERSION" != "$VERSION" ]]; then
  echo "❌ Root version mismatch"
  echo "package.json: $ROOT_VERSION"
  echo "requested: $VERSION"
  exit 1
fi

echo "✅ Version matches"

if [[ "$VERSION" == v* ]]; then
  echo "Tag-based release detected"
fi

echo "✅ Release validation passed"
