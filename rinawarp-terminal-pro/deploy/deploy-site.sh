#!/bin/bash
# Deploy script for RinaWarp marketing site
# Usage: ./deploy.sh [--git-sync]

set -e

BRANCH="master"
PROJECT="rinawarptech-website"
DEPLOY_DIR="apps/marketing-web"

# Generate build fingerprint
BUILD_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "no-git")
BUILD_TIME=$(date -u +%Y%m%dT%H%M%SZ)
BUILD="${BUILD_COMMIT}-${BUILD_TIME}"

echo "Building fingerprint: ${BUILD}"

# Write _build.txt
echo "BUILD: ${BUILD}" > "${DEPLOY_DIR}/_build.txt"
cat "${DEPLOY_DIR}/_build.txt"

# Deploy to Cloudflare Pages
echo "Deploying to Cloudflare Pages..."
cd /home/karina/Documents/rinawarp-terminal-pro
npx wrangler pages deploy "${DEPLOY_DIR}" \
  --project-name "${PROJECT}" \
  --branch "${BRANCH}" \
  --commit-dirty=true

# Verify deployment
echo ""
echo "Verifying deployment..."
curl -s "https://www.rinawarptech.com/_build.txt"
echo ""

# If --git-sync flag, commit and push
if [[ "$1" == "--git-sync" ]]; then
    echo "Syncing to GitHub..."
    git add -A
    git commit -m "Deploy: ${BUILD}" || echo "Nothing to commit"
    git push origin "${BRANCH}"
    echo "GitHub sync complete"
fi

echo ""
echo "✅ Deployment complete!"
