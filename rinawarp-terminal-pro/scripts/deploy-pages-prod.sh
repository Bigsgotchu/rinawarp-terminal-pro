#!/usr/bin/env bash
set -euo pipefail

: "${CF_PAGES_PROJECT:=rinawarptech-website}"
: "${CF_PAGES_BRANCH:=master}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="$ROOT/rinawarptech-website"
WEB_DIR="$REPO/web"
MANIFEST="$WEB_DIR/releases/v1.0.0.json"

cd "$REPO"

DATE_UTC="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

echo "deploy=${DATE_UTC} source=wrangler-only" > "$WEB_DIR/_build.txt"

if [[ ! -f "$MANIFEST" ]]; then
  echo "❌ Missing required release manifest: $MANIFEST"
  exit 1
fi

if ! node -e 'const fs=require("fs"); const p=process.argv[1]; const j=JSON.parse(fs.readFileSync(p,"utf8")); if(!j.version||!j.downloads){process.exit(2)}' "$MANIFEST"; then
  echo "❌ Invalid release manifest JSON: $MANIFEST"
  exit 1
fi

echo "== Deploying $CF_PAGES_PROJECT from $WEB_DIR =="
npx wrangler pages deploy "$WEB_DIR" --project-name "$CF_PAGES_PROJECT" --branch "$CF_PAGES_BRANCH" --commit-dirty=true

echo "== Done =="
