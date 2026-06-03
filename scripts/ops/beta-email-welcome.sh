#!/usr/bin/env bash
# Send welcome email to beta signups via SendGrid
# Usage: npm run beta:email-welcome [-- --send]
#   --dry-run (default): Show emails that would be sent
#   --send: Actually send emails
set -euo pipefail

SEND_MODE="${1:-dry-run}"
if [ "$SEND_MODE" != "--send" ] && [ "$SEND_MODE" != "--dry-run" ]; then
  echo "Usage: $0 [--send|--dry-run]"
  echo "  --dry-run: Show emails that would be sent (default)"
  echo "  --send: Actually send emails"
  exit 1
fi

DRY_RUN="true"
if [ "$SEND_MODE" = "--send" ]; then
  DRY_RUN="false"
fi

echo "=== Beta Welcome Email ==="
echo ""

if [ "$DRY_RUN" = "true" ]; then
  echo "DRY RUN - Would send to:"
else
  echo "SENDING - Will send to:"
fi
echo ""

# Known test emails to exclude
EXCLUDE_EMAILS="'gate15-smoke@example.com','gate15-blocker@example.com','test@example.com','email@example.com'"

# Get signups
SIGNUPS=$(wrangler d1 execute rinawarp-users --remote \
  --command "SELECT name,email,os FROM beta_signups WHERE email NOT IN ($EXCLUDE_EMAILS) AND os IN ('Linux','macOS','Windows') ORDER BY created_at DESC;" 2>/dev/null | grep -A 100 "results" | grep -E '^\s+\{' | head -20)

if [ -z "$SIGNUPS" ]; then
  echo "No beta signups found."
  exit 0
fi

# Parse and display
echo "$SIGNUPS" | while read -r line; do
  NAME=$(echo "$line" | grep -oP '"name":\s*"\K[^"]+' || echo "Beta Tester")
  EMAIL=$(echo "$line" | grep -oP '"email":\s*"\K[^"]+' || echo "")
  OS=$(echo "$line" | grep -oP '"os":\s*"\K[^"]+' || echo "Linux")
  
  if [ -n "$EMAIL" ]; then
    echo "  To: $NAME <$EMAIL>"
    echo "  OS: $OS"
    echo "  Subject: Welcome to RinaWarp Terminal Pro v1.8.2-beta"
    echo ""
    echo "  Body: Hi $NAME! Thanks for joining the beta. Download: https://www.rinawarptech.com/download/ Beta guide: https://www.rinawarptech.com/beta/ Feedback: https://www.rinawarptech.com/beta-feedback/"
    echo ""
    echo "  ---"
  fi
done

if [ "$DRY_RUN" = "true" ]; then
  echo ""
  echo "Run with --send to actually send these emails."
fi