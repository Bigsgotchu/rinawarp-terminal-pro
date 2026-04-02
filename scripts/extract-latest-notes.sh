#!/usr/bin/env bash
set -euo pipefail

awk '
  /^## / && seen { exit }
  /^## / { seen=1 }
  seen { print }
' CHANGELOG.md
