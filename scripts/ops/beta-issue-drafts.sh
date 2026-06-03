#!/usr/bin/env bash
set -euo pipefail

echo "=== Beta Issue Drafts ==="
echo ""
echo "Checking for reported blockers..."
echo ""

TRACKER="${HOME}/RINAWARP_RECOVERY/BETA_TRACKER.md"

# Check for any feedback mentioning issues
echo "Recent /api/feedback logs:"
wrangler d1 execute rinawarp-users --remote --command "SELECT * FROM beta_signups WHERE message LIKE '%error%' OR message LIKE '%fail%' OR message LIKE '%bug%' LIMIT 5" 2>/dev/null || echo "  (no issues table - feedback stored in logs)"

echo ""
echo "Manual check:"
echo "  1. Review https://www.rinawarptech.com/beta-feedback/ submissions"
echo "  2. Check Worker logs for errors"
echo "  3. Update BETA_TRACKER.md with blockers"
echo ""
echo "Template for blocker report:"
echo "---"
echo "BLOCKER: [Brief description]"
echo "Tester: [Name/OS]"
echo "Step: [what they were doing]"
echo "Error: [exact message]"
echo "---"