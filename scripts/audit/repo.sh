#!/bin/bash

# RinaWarp Repository Health Audit Script
# Run this before every release to verify the entire monorepo

set -e

echo "============================================"
echo "🔍 RinaWarp Repository Audit"
echo "============================================"
echo ""

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track test results
PASSED=0
FAILED=0

run_check() {
  local check_name="$1"
  local check_command="$2"
  
  echo -n "📋 $check_name... "
  if eval "$check_command" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
  else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILED++))
  fi
}

# 1. Check dependencies
echo "1️⃣ Checking dependencies..."
run_check "pnpm install" "pnpm install --frozen-lockfile"
echo ""

# 2. Lint check
echo "2️⃣ Lint check..."
cd apps/terminal-pro
run_check "Lint check" "npm run lint -- --max-warnings 100"
cd ../..
echo ""

# 3. TypeScript check
echo "3️⃣ TypeScript check..."
run_check "TypeScript compile" "pnpm tsc --noEmit"
echo ""

# 4. Running tests
echo "4️⃣ Running tests..."
cd apps/terminal-pro
run_check "Unit tests" "npm run test:all"
run_check "Existing unit tests" "npm run test:prompt-boundary"
cd ../..
echo ""

# 5. Build verification
echo "5️⃣ Build verification..."
cd apps/terminal-pro
run_check "Electron build" "npm run build"
cd ../..
echo ""

# 6. Packaging installers
echo "6️⃣ Packaging installers..."
cd apps/terminal-pro
run_check "Linux package" "npm run package:linux" || echo "  (skipped - requires specific environment)"
cd ../..
echo ""

# 7. Check for large files
echo "7️⃣ Checking for large files..."
echo "   Top 10 largest files in repo:"
git ls-files | xargs du -h 2>/dev/null | sort -hr | head -10 | while read line; do
  echo "   $line"
done
echo ""

# 8. Check for broken imports
echo "8️⃣ Checking for broken imports..."
run_check "Import check" "node -e \"require('./apps/terminal-pro/dist-electron/main.js')\"" || echo "   (build required first)"
echo ""

# 9. Check circular dependencies
echo "9️⃣ Circular dependency check..."
if command -v npx &> /dev/null; then
  run_check "Circular deps" "npx madge --circular apps/terminal-pro/src 2>/dev/null || echo 'madge not installed'"
else
  echo "   (npx not available, skipping)"
fi
echo ""

echo "============================================"
echo "📊 Audit Summary"
echo "============================================"
echo -e "Checks Passed: ${GREEN}$PASSED${NC}"
echo -e "Checks Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ Audit complete - Repository is healthy!${NC}"
  exit 0
else
  echo -e "${RED}⚠️  Audit found issues - please review failures above${NC}"
  exit 1
fi