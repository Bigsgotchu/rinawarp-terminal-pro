#!/usr/bin/env bash
# Export beta signups from D1 (only opted-in testers)
# Usage: npm run beta:export-signups
set -euo pipefail

echo "=== Beta Signup Export (Opt-in Testers Only) ==="
echo ""

# Known test emails to exclude
EXCLUDE_EMAILS="'gate15-smoke@example.com','gate15-blocker@example.com','test@example.com','email@example.com'"

echo "Exporting from remote D1..."
wrangler d1 execute rinawarp-users --remote \
  --command "SELECT name,email,os,created_at FROM beta_signups WHERE email NOT IN ($EXCLUDE_EMAILS) ORDER BY created_at DESC;" 2>&1

echo ""
echo "Note: This only exports people who opted in via /beta signup."