#!/usr/bin/env bash
set -euo pipefail

LAST_TAG="$(git describe --tags --abbrev=0 2>/dev/null || echo "")"

if [[ -z "$LAST_TAG" ]]; then
  RANGE="HEAD"
else
  RANGE="${LAST_TAG}..HEAD"
fi

COMMITS="$(git log $RANGE --pretty=format:"%s")"

if [[ -z "$COMMITS" ]]; then
  echo "No commits since last release" >&2
  exit 1
fi

BUMP="patch"

while IFS= read -r line; do
  if [[ "$line" == *"BREAKING CHANGE"* ]] || [[ "$line" == feat!* ]]; then
    BUMP="major"
    break
  elif [[ "$line" == feat:* ]]; then
    BUMP="minor"
  elif [[ "$line" == fix:* ]]; then
    if [[ "$BUMP" != "minor" ]]; then
      BUMP="patch"
    fi
  fi
done <<< "$COMMITS"

echo "$BUMP"
