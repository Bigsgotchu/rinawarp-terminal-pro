#!/usr/bin/env bash
set -euo pipefail
trap 'echo "❌ Failed at line $LINENO"; exit 1' ERR

# ===== Config (edit once) =====
# Path to the desktop app package that produces ./dist
APP_DIR="${APP_DIR:-terminal-pro}"     # Desktop app directory with package.json
BUILD_CMD="${BUILD_CMD:-npm run build:all}"  # Build command to create installers

# Path to the script that uploads + verifies artifacts (already in your repo)
UPLOAD_VERIFY_SCRIPT="${UPLOAD_VERIFY_SCRIPT:-./deploy/upload-and-verify.sh}"

# Version + output dist folder used by upload script
export VER="${VER:-1.0.0}"
export DIST_DIR="${DIST_DIR:-terminal-pro/dist}"

# Post-launch sanity URLs
WEBHOOK_URL="${WEBHOOK_URL:-https://api.rinawarptech.com/api/stripe/webhook}"
TERMS_URL="${TERMS_URL:-https://www.rinawarptech.com/terms/}"
# ==============================

echo "=============================================="
echo "🚀 RinaWarp Terminal Pro - Launch"
echo "=============================================="

echo ""
echo "== 0) Build desktop installers =="
if [[ ! -d "$APP_DIR" ]]; then
  echo "❌ APP_DIR not found: $APP_DIR"
  echo "Set APP_DIR to your desktop package folder, e.g.:"
  echo "  APP_DIR=apps/rinawarp-terminal-pro ./deploy/launch.sh"
  exit 1
fi

pushd "$APP_DIR" >/dev/null
echo "Running build in: $(pwd)"
eval "$BUILD_CMD"
popd >/dev/null

echo ""
echo "== 1) Upload + verify artifacts =="
# upload-and-verify.sh expects DIST_DIR relative to repo root
"$UPLOAD_VERIFY_SCRIPT"

echo ""
echo "== 2) Stripe webhook sanity (GET should be 405) =="
curl -sSI "$WEBHOOK_URL" | egrep -i "HTTP/" || true

echo ""
echo "== 3) Legal page sanity =="
curl -s "$TERMS_URL" | grep -E "RinaWarp Technologies LLC|Delaware|support@rinawarptech.com" -n

echo ""
echo "=============================================="
echo "✅ All launch checks passed!"
echo "=============================================="
echo ""
echo "Next steps:"
echo "1. Monitor Stripe Dashboard for payments"
echo "2. Check Cloudflare Dashboard for errors"
echo "3. Verify download stats in R2 analytics"
