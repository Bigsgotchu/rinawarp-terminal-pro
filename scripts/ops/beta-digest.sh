#!/usr/bin/env bash
set -euo pipefail

echo "=== Beta Digest ==="
echo ""
echo "Round 1 Tester Recruitment Status"
echo "=================================="
echo ""

TRACKER="${HOME}/RINAWARP_RECOVERY/BETA_TRACKER.md"

# Count testers by status
echo "Progress Summary:"
echo "  Invited: $(grep -c 'invited' "$TRACKER" 2>/dev/null || echo 0)"
echo "  Accepted: $(grep -c 'accepted' "$TRACKER" 2>/dev/null || echo 0)"
echo "  First Proof: $(grep -c 'first proof' "$TRACKER" 2>/dev/null || echo 0)"
echo ""

echo "Recent beta signups (D1):"
wrangler d1 execute rinawarp-users --remote --command "SELECT name, os, created_at FROM beta_signups ORDER BY created_at DESC LIMIT 5" 2>/dev/null || echo "  (unable to query)"

echo ""
echo "Next actions:"
echo "  - Review BETA_TRACKER.md for follow-ups"
echo "  - Run: npm run beta:followups"
echo "  - Check /beta-feedback for form submissions"