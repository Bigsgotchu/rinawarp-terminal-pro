#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROJECT_NAME="${CF_PAGES_PROJECT:-rinawarptech-website}"
BRANCH="${CF_PAGES_BRANCH:-master}"
DIST_DIR="$ROOT_DIR/website/.pages-dist"
VERIFY_DOWNLOADS="${RINAWARP_SKIP_DOWNLOAD_VERIFICATION:-0}"
VERIFY_MODE="${RINAWARP_DOWNLOAD_VERIFY_MODE:-}"

if [[ -z "$VERIFY_MODE" ]]; then
  if [[ "$VERIFY_DOWNLOADS" == "1" ]]; then
    VERIFY_MODE="off"
  elif [[ "$PROJECT_NAME" == "rinawarptech-website" && "$BRANCH" == "master" ]]; then
    VERIFY_MODE="strict"
  else
    VERIFY_MODE="warn"
  fi
fi

if [[ "$VERIFY_MODE" == "strict" ]]; then
  echo "[deploy:pages] Verifying release/download bundle (strict mode)"
  node "$ROOT_DIR/scripts/qa/verify-download-links.mjs"
elif [[ "$VERIFY_MODE" == "warn" ]]; then
  echo "[deploy:pages] Verifying release/download bundle (warn mode)"
  if ! node "$ROOT_DIR/scripts/qa/verify-download-links.mjs"; then
    echo "[deploy:pages] WARNING: release/download verification failed, continuing because mode=warn"
  fi
else
  echo "[deploy:pages] Skipping release/download verification (mode=${VERIFY_MODE})"
fi

echo "[deploy:pages] Building Pages worker bundle"
node "$ROOT_DIR/scripts/build/build-pages-site.mjs"

COMMIT_HASH="$(git -C "$ROOT_DIR" rev-parse HEAD 2>/dev/null || echo local)"
COMMIT_MSG="$(git -C "$ROOT_DIR" log -1 --pretty=%s 2>/dev/null || echo "Deploy Pages worker")"

echo "[deploy:pages] Deploying $DIST_DIR to Pages project $PROJECT_NAME on branch $BRANCH"
npx wrangler@3.90.0 pages deploy "$DIST_DIR" \
  --project-name "$PROJECT_NAME" \
  --branch "$BRANCH" \
  --commit-hash "$COMMIT_HASH" \
  --commit-message "$COMMIT_MSG" \
  --commit-dirty=true

if [[ "$PROJECT_NAME" == "rinawarptech-website" && "$BRANCH" == "master" ]]; then
  echo "[deploy:pages] Running production trust-path smoke"
  npm run smoke:prod
fi

echo "[deploy:pages] Done"
