#!/usr/bin/env bash
set -euo pipefail

LIMIT="${1:-300}"

find . \
  -type f \
  \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.html" -o -name "*.css" -o -name "*.mjs" -o -name "*.cjs" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/dist/*" \
  -not -path "*/dist-electron/*" \
  -not -path "*/build/*" \
  -not -path "*/coverage/*" \
  -not -path "*/.git/*" \
  -print0 |
  xargs -0 wc -l |
  sort -nr |
  awk -v limit="$LIMIT" '$1 >= limit || $2 == "total"'
