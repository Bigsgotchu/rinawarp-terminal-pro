#!/usr/bin/env bash
set -euo pipefail

BASE_VERSION="${1:-}"
CHANNEL="${2:-}"

if [[ -z "$BASE_VERSION" || -z "$CHANNEL" ]]; then
  echo "❌ Missing args" >&2
  exit 1
fi

TIMESTAMP="$(date +%Y%m%d%H%M)"

case "$CHANNEL" in
  stable)
    VERSION="$BASE_VERSION"
    ;;
  beta)
    VERSION="$BASE_VERSION-beta.$TIMESTAMP"
    ;;
  alpha)
    VERSION="$BASE_VERSION-alpha.$TIMESTAMP"
    ;;
  *)
    echo "❌ Unknown channel" >&2
    exit 1
    ;;
esac

echo "Version: $VERSION" >&2

# Skip file updates during prepare job - only output version for beta builds
CURRENT_FULL="$(node -p "require('./apps/terminal-pro/package.json').version")"
if [[ "$CURRENT_FULL" == *"-beta"* || "$CURRENT_FULL" == *"-alpha"* ]]; then
  echo "Pre-release already set - keeping existing version: $CURRENT_FULL" >&2
  printf '%s\n' "$CURRENT_FULL"
  exit 0
fi

node - <<'NODE' "$VERSION"
const fs = require('fs')

const version = process.argv[2]
const files = [
  './package.json',
  './apps/terminal-pro/package.json',
]

for (const file of files) {
  const pkg = JSON.parse(fs.readFileSync(file, 'utf8'))
  pkg.version = version
  fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n')
}
NODE

printf '%s\n' "$VERSION"
