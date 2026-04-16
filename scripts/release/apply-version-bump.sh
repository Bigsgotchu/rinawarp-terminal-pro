#!/usr/bin/env bash
set -euo pipefail

BUMP_TYPE="${1:-}"

if [[ -z "$BUMP_TYPE" ]]; then
  echo "❌ Missing bump type" >&2
  exit 1
fi

CURRENT_VERSION="$(node -p "require('./apps/terminal-pro/package.json').version")"
CURRENT_VERSION="${CURRENT_VERSION%%-*}"

echo "Current version: $CURRENT_VERSION" >&2
echo "Bump type: $BUMP_TYPE" >&2

IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

case "$BUMP_TYPE" in
  major)
    MAJOR=$((MAJOR + 1))
    MINOR=0
    PATCH=0
    ;;
  minor)
    MINOR=$((MINOR + 1))
    PATCH=0
    ;;
  patch)
    PATCH=$((PATCH + 1))
    ;;
  *)
    echo "❌ Invalid bump type" >&2
    exit 1
    ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"

echo "New version: $NEW_VERSION" >&2

node - <<'NODE' "$NEW_VERSION"
const fs = require('fs')

const newVersion = process.argv[2]
const files = [
  './package.json',
  './apps/terminal-pro/package.json',
]

for (const file of files) {
  const pkg = JSON.parse(fs.readFileSync(file, 'utf8'))
  pkg.version = newVersion
  fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n')
}
NODE

printf '%s\n' "$NEW_VERSION"
