#!/usr/bin/env bash
# Show beta tester leads and status
set -euo pipefail

TRACKER="${HOME}/RINAWARP_RECOVERY/BETA_TRACKER.md"

echo "=== Beta Tester Leads ==="
echo ""

if [ -f "$TRACKER" ]; then
  cat "$TRACKER"
else
  echo "No tracker found at $TRACKER"
  echo ""
  echo "Create one with: bash scripts/founder/beta-outreach/add-lead.sh \"Name\" \"Platform\""
fi

echo ""
echo "=== Database Signups ==="
if command -v wrangler &> /dev/null; then
  wrangler d1 execute rinawarp-users --remote --command "SELECT name, email, os, created_at FROM beta_signups ORDER BY created_at DESC LIMIT 10" 2>/dev/null || echo "(Run 'wrangler d1 execute...' to see signups)"
else
  echo "wrangler not found - install with: npm install -g wrangler"
fi