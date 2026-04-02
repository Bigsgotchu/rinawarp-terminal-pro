#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

next_version="${1:-}"
if [[ -z "$next_version" ]]; then
  echo "Usage: bash deploy/bump-release-version.sh <version>" >&2
  exit 1
fi

node - "$next_version" <<'NODE'
const fs = require('fs')
const path = require('path')

const nextVersion = process.argv[2]
const files = [
  path.join(process.cwd(), 'package.json'),
  path.join(process.cwd(), 'apps/terminal-pro/package.json'),
]

for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8')
  const data = JSON.parse(raw)
  data.version = nextVersion
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8')
  console.log(`[release:bump] Updated ${file} -> ${nextVersion}`)
}
NODE
