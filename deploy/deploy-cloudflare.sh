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
npx wrangler deploy --env production

echo ""
echo "Step 2: Checking Pages project status..."
echo "-----------------------------------------"
echo "NOTE: The Pages project 'rinawarptech-website' serves stale content."
echo ""
echo "Options to fix the stale Pages deployment:"
echo ""
echo "A) Redeploy Pages (requires Cloudflare access):"
echo "   npx wrangler pages deploy . --project-name=rinawarptech-website"
echo ""
echo "B) OR delete the Pages project to let Worker handle all routes:"
echo "   Go to Cloudflare Dashboard > Pages > rinawarptech-website > Settings > Delete"
echo ""
echo "C) OR configure Cloudflare to bypass Pages for API routes:"
echo "   Go to Cloudflare Dashboard > Pages > rinawarptech-website > Settings > Environment > Production"
echo "   Set '_worker.js' route rules to bypass Pages for /download/* and /releases/*"
echo ""

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
echo "1. Fix the Pages project (see options above)"
echo "2. Verify apex URLs work correctly"
echo "3. Run real checkout + entitlement loop"
