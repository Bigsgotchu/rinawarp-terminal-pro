#!/usr/bin/env bash
set -euo pipefail

TRACKER="${HOME}/RINAWARP_RECOVERY/BETA_TRACKER.md"

echo "=== Beta Tester Status ==="
echo ""
echo "Round 1 Goal: 1 Linux + 1 macOS + 1 Windows tester"
echo ""

if command -v wrangler &> /dev/null; then
    echo "D1 beta_signups:"
    wrangler d1 execute rinawarp-users --remote --command "SELECT id, name, email, os, created_at FROM beta_signups ORDER BY created_at DESC LIMIT 10" 2>/dev/null || echo "  (run manually: wrangler d1 execute...)"
else
    echo "wrangler not found - run: npx wrangler d1 execute rinawarp-users --remote --command \"SELECT * FROM beta_signups\""
fi

echo ""
echo "Tracker: $TRACKER"
cat "$TRACKER" 2>/dev/null | head -30 || echo "  (tracker not found)"