#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:-}"

if [[ -z "$VERSION" ]]; then
  echo "❌ Missing version"
  exit 1
fi

echo "🧠 Generating changelog for $VERSION"

LAST_TAG="$(git describe --tags --abbrev=0 2>/dev/null || echo "")"

if [[ -z "$LAST_TAG" ]]; then
  RANGE=""
else
  RANGE="$LAST_TAG..HEAD"
fi

COMMITS="$(git log $RANGE --pretty=format:"%s")"

FEATURES=""
FIXES=""
OTHERS=""

while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  if [[ "$line" == feat:* ]]; then
    FEATURES+="- ${line#feat: }"$'\n'
  elif [[ "$line" == fix:* ]]; then
    FIXES+="- ${line#fix: }"$'\n'
  else
    OTHERS+="- $line"$'\n'
  fi
done <<< "$COMMITS"

DATE="$(date +"%Y-%m-%d")"

ENTRY="## $VERSION ($DATE)

### 🚀 Features
${FEATURES:-None}

### 🐛 Fixes
${FIXES:-None}

### 🧩 Other
${OTHERS:-None}
"

echo "$ENTRY"

if [[ -f CHANGELOG.md ]]; then
  printf "%b\n%b" "$ENTRY" "$(cat CHANGELOG.md)" > CHANGELOG.md
else
  printf "%b" "$ENTRY" > CHANGELOG.md
fi

echo "✅ CHANGELOG.md updated"
