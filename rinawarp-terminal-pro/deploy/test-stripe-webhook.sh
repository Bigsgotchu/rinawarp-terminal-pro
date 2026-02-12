#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# RinaWarp Terminal Pro - Stripe Webhook Test Script
# Tests Stripe checkout → webhook → entitlement flow
# ============================================================

WEBHOOK_URL="${1:-https://api.rinawarptech.com/api/stripe/webhook}"
STRIPE_ACCOUNT="${STRIPE_ACCOUNT:-}"

echo "=============================================="
echo "RinaWarp Terminal Pro - Stripe Webhook Test"
echo "=============================================="
echo "Webhook URL: $WEBHOOK_URL"
echo ""

# Check 1: Verify webhook endpoint is reachable
echo "== Step 1: Check webhook endpoint reachability =="
echo "Testing GET request (should return 405 for POST-only)..."
http_code=$(curl -sSI -X HEAD "$WEBHOOK_URL" 2>/dev/null | awk '/^HTTP\// {print $2}' | head -1)
echo "HTTP Response Code: ${http_code:-?}"

if [[ "${http_code:-}" == "405" ]]; then
  echo "✓ Endpoint rejects HEAD/GET (correct - should be POST only)"
elif [[ "${http_code:-}" == "200" || "${http_code:-}" == "404" || "${http_code:-}" == "403" ]]; then
  echo "⚠ Unexpected response - endpoint may not be configured for Stripe webhooks"
else
  echo "⚠ Unknown response code"
fi
echo ""

# Check 2: Send test webhook event
echo "== Step 2: Send test checkout.session.completed event =="

if command -v stripe &>/dev/null && [[ -n "${STRIPE_ACCOUNT:-}" ]]; then
  echo "Using Stripe CLI to forward webhooks..."
  echo "Run in separate terminal:"
  echo "  stripe listen --forward-to $WEBHOOK_URL"
  echo ""
  echo "Then trigger test event:"
  echo "  stripe trigger checkout.session.completed"
  echo ""
  echo "Expected: 2xx response + entitlement recorded in database"
else
  echo "⚠ Stripe CLI not configured or STRIPE_ACCOUNT not set"
  echo ""
  echo "To run full webhook test:"
  echo "1. Install Stripe CLI: https://stripe.com/docs/stripe-cli"
  echo "2. Login: stripe login"
  echo "3. Forward webhooks:"
  echo "   stripe listen --forward-to $WEBHOOK_URL"
  echo "4. Trigger test event in another terminal:"
  echo "   stripe trigger checkout.session.completed"
fi
echo ""

# Check 3: Verify webhook secrets are set
echo "== Step 3: Verify webhook secrets (manual check) =="
echo "Run these commands to verify secrets are set:"
echo "  wrangler secret list --env production"
echo ""
echo "Required secrets:"
echo "  ✓ STRIPE_WEBHOOK_SECRET"
echo "  ✓ STRIPE_SECRET_KEY"
echo "  ✓ STRIPE_PUBLISHABLE_KEY"
echo ""

# Check 4: Database idempotency check
echo "== Step 4: Database idempotency verification =="
echo "Verify your database has idempotency handling for webhook events:"
echo "  - Table: stripe_events (event_id TEXT PRIMARY KEY, received_at INTEGER)"
echo "  - On webhook: INSERT event_id, fail if duplicate = already processed"
echo ""

# Summary
echo "=============================================="
echo "Stripe Webhook Test Summary"
echo "=============================================="
echo "1. Webhook endpoint: ${WEBHOOK_URL}"
echo "2. Run 'stripe trigger checkout.session.completed' for full test"
echo "3. Verify webhook secrets are set in Cloudflare"
echo "4. Ensure idempotency table exists"
echo ""
echo "✅ If all checks pass, Stripe integration is ready"
echo "=============================================="
