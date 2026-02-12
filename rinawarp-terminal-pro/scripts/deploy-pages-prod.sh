#!/usr/bin/env bash
set -euo pipefail

: "${CF_PAGES_PROJECT:=rinawarptech-website}"
: "${CF_PAGES_BRANCH:=master}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="$ROOT/rinawarptech-website"
WEB_DIR="$REPO/web"

if [[ ! -d "$WEB_DIR" ]]; then
  echo "❌ Missing deploy root: $WEB_DIR"
  echo "Expected canonical website root at rinawarptech-website/web"
  exit 1
fi

cd "$REPO"

DATE_UTC="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "deploy=${DATE_UTC} source=wrangler-only" > "$WEB_DIR/_build.txt"

LATEST_MANIFEST="$(ls -1 "$WEB_DIR"/releases/v*.json 2>/dev/null | sort -V | tail -n 1 || true)"
if [[ -z "$LATEST_MANIFEST" ]]; then
  echo "❌ Missing required release manifest under: $WEB_DIR/releases/v*.json"
  exit 1
fi

if ! node -e 'const fs=require("fs"); const p=process.argv[1]; const j=JSON.parse(fs.readFileSync(p,"utf8")); if(!j.version||!j.downloads){process.exit(2)}' "$LATEST_MANIFEST"; then
  echo "❌ Invalid release manifest JSON: $LATEST_MANIFEST"
  exit 1
fi

echo "== Using release manifest: $LATEST_MANIFEST =="
echo "== Deploying $CF_PAGES_PROJECT from $WEB_DIR =="
npx wrangler pages deploy "$WEB_DIR" --project-name "$CF_PAGES_PROJECT" --branch "$CF_PAGES_BRANCH" --commit-dirty=true

echo "== Done =="
