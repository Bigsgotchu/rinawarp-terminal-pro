#!/usr/bin/env bash
set -euo pipefail

echo "=== Beta Follow-ups ==="
echo ""
echo "Check for testers who accepted but haven't submitted feedback..."
echo ""

TRACKER="${HOME}/RINAWARP_RECOVERY/BETA_TRACKER.md"

# Check D1 for recent signups
echo "Recent beta signups (last 7 days):"
wrangler d1 execute rinawarp-users --remote --command "SELECT name, email, os, created_at FROM beta_signups WHERE created_at > strftime('%s', 'now', '-7 days') ORDER BY created_at DESC" 2>/dev/null || echo "  (unable to query)"

echo ""
echo "Next steps:"
echo "1. Review BETA_TRACKER.md for testers needing follow-up"
echo "2. Email testers who reached 'proof exported' but not 'feedback submitted'"
echo "3. Ask for screenshots of Proof persistence"
echo "4. Log blockers in ARCHIVE_ANALYSIS.md"