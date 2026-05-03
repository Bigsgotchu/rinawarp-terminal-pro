#!/usr/bin/env bash
set -euo pipefail

find apps packages \
  -type f \
  \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.html" -o -name "*.css" \) \
  -not -path "*/dist/*" \
  -not -path "*/dist-electron/*" \
  -not -path "*/node_modules/*" \
  -print0 |
xargs -0 wc -l |
sort -nr |
head -40
