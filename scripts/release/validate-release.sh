#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:-}"

if [[ -z "$VERSION" ]]; then
  echo "❌ Missing version argument"
  exit 1
fi

echo "🔍 Validating release for version: $VERSION"

PKG_VERSION="$(node -p "require('./apps/terminal-pro/package.json').version")"

# Skip dirty check for beta releases (versions ending in -beta)
if [[ "$VERSION" == *"-beta"* || "$VERSION" == *"-alpha"* ]]; then
  if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "⚠️ Dirty workspace detected (allowed for beta builds)"
    git status --short
  fi
else
  if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "❌ Dirty workspace — refusing release"
    git status --short
    exit 1
  fi
fi

if [[ "$VERSION" == v* ]]; then
  echo "Tag-based release detected"
fi

# For beta/alpha releases, compare base version
BASE_VERSION="${VERSION%%-*}"
if [[ "$VERSION" == *"-beta"* || "$VERSION" == *"-alpha"* ]]; then
  if [[ "$PKG_VERSION" != "$VERSION" && "$PKG_VERSION" != "$BASE_VERSION"* ]]; then
    echo "❌ Version mismatch (expected $VERSION or $BASE_VERSION.*-beta)"
    echo "apps/terminal-pro/package.json: $PKG_VERSION"
    echo "requested: $VERSION"
    exit 1
  fi
  echo "✅ Pre-release version matches"
else
  if [[ "$PKG_VERSION" != "$VERSION" && "v$PKG_VERSION" != "$VERSION" ]]; then
    echo "❌ Version mismatch"
    echo "apps/terminal-pro/package.json: $PKG_VERSION"
    echo "requested: $VERSION"
    exit 1
  fi
  echo "✅ Version matches"
fi

echo "✅ Release validation passed"
