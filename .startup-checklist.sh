#!/bin/bash
# Daily startup checklist for RinaWarp Terminal Pro
# Run this before every session

echo ""
echo "🚀 RinaWarp Terminal Pro - Daily Startup Checklist"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verify location
echo "1️⃣  Repo Location"
echo "   PWD: $(pwd)"
if [ "$(pwd)" != "$HOME/rinawarp-terminal-pro" ]; then
  echo "   ⚠️  WARNING: Not in canonical location"
  echo "   cd $HOME/rinawarp-terminal-pro"
  exit 1
fi
echo "   ✓ Canonical location confirmed"
echo ""

# Check remote
echo "2️⃣  Git Remote"
git remote -v | head -1 | grep -q "Bigsgotchu/rinawarp-terminal-pro" && echo "   ✓ Remote: Bigsgotchu/rinawarp-terminal-pro" || echo "   ✗ Wrong remote!"
echo ""

# Check branch
echo "3️⃣  Git Branch"
BRANCH=$(git branch --show-current)
if [ "$BRANCH" = "main" ]; then
  echo "   ✓ Branch: main"
else
  echo "   ⚠️  Branch: $BRANCH (expected main)"
fi
echo ""

# Check version
echo "4️⃣  Package Version"
VERSION=$(node -p "require('./apps/terminal-pro/package.json').version")
echo "   Version: $VERSION"
echo ""

# Run identity check
echo "5️⃣  Repo Identity Guard"
npm run founder:check-repo 2>&1 | grep -E "(passed|Repository:|version:)" | sed 's/^/   /'
echo ""

echo "✅ Startup checklist complete. Ready to work!"
echo ""
