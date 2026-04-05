#!/bin/bash
set -e

#!/bin/bash
# RinaWarp Cloudflare Deployment Script
# Deploys the Worker and provides guidance for Pages project

echo "========================================="
echo "RinaWarp Cloudflare Deployment"
echo "========================================="

# Check for Wrangler
if ! command -v wrangler &> /dev/null; then
    echo "Installing wrangler..."
    npm install -g wrangler
fi

cd "$(dirname "$0")/../website"

echo ""
echo "Step 1: Deploying RinaWarp Marketplace Worker..."
echo "-----------------------------------------"
npx wrangler deploy --config wrangler.toml

echo ""
echo "Step 2: Deploying Pages compatibility layer..."
echo "-----------------------------------------"
npx wrangler pages deploy pages --project-name=rinawarptech-website
echo ""
echo "Pages compatibility layer deployed for legacy /downloads redirects."

echo ""
echo "Step 3: Verifying Worker deployment..."
echo "-----------------------------------------"
echo "Testing release manifest..."
curl -sI https://rinawarptech.com/releases/latest.json | head -5

echo ""
echo "Testing download redirect..."
curl -sI -L https://rinawarptech.com/download/linux | grep -E "^HTTP|^location" | head -3

echo ""
echo "========================================="
echo "Deployment complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Verify apex URLs work correctly"
echo "2. Run real checkout + entitlement loop"
echo "3. Keep Worker routes as the source of truth for /releases/* and API endpoints"
