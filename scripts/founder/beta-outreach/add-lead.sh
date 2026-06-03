#!/usr/bin/env bash
# Add a beta tester lead to the tracker
# Usage: bash scripts/founder/beta-outreach/add-lead.sh "Name" "Linux" "github-username or null"
set -euo pipefail

TRACKER="${HOME}/RINAWARP_RECOVERY/BETA_TRACKER.md"
mkdir -p "$(dirname "$TRACKER")"

NAME="${1:-}"
PLATFORM="${2:-}"
PROFILE="${3:-null}"

if [ -z "$NAME" ] || [ -z "$PLATFORM" ]; then
  echo "Usage: $0 \"Name\" \"Platform\" \"Profile (optional)\""
  echo "Example: $0 \"Jane Developer\" \"Linux\" \"janedev\""
  exit 1
fi

# Append lead to tracker
echo "- [ ] **$NAME** (Platform: $PLATFORM, Profile: $PROFILE)" >> "$TRACKER"
echo "Added lead: $NAME ($PLATFORM)"

# Show tracker
cat "$TRACKER"