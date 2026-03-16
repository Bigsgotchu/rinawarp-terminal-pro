#!/bin/bash

# RinaWarp Terminal Pro - Smoke Test Script
# Run this before every release to verify the build works

set -e

echo "============================================"
echo "RinaWarp Terminal Pro - Smoke Test"
echo "============================================"
echo ""

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track test results
TESTS_PASSED=0
TESTS_FAILED=0

run_test() {
  local test_name="$1"
  local test_command="$2"
  
  echo -n "Testing: $test_name... "
  if eval "$test_command" > /dev/null 2>&1; then
    echo -e "${GREEN}PASS${NC}"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}FAIL${NC}"
    ((TESTS_FAILED++))
  fi
}

echo "Step 1: Testing build..."
echo "--------------------------------------------"
run_test "Clean build" "cd apps/terminal-pro && npm run build:electron"
echo ""

echo "Step 2: Testing lint..."
echo "--------------------------------------------"
run_test "Lint check" "cd apps/terminal-pro && npm run lint -- --max-warnings 0"
echo ""

echo "Step 3: Testing agent tests..."
echo "--------------------------------------------"
run_test "Agent tests" "cd apps/terminal-pro && node --test tests/agent.test.ts"
echo ""

echo "Step 4: Testing CLI tests..."
echo "--------------------------------------------"
run_test "CLI tests" "cd apps/terminal-pro && node --test tests/cli.test.ts"
echo ""

echo "Step 5: Testing streaming tests..."
echo "--------------------------------------------"
run_test "Streaming tests" "cd apps/terminal-pro && node --test tests/streaming.test.ts"
echo ""

echo "Step 6: Testing existing unit tests..."
echo "--------------------------------------------"
run_test "Prompt boundary test" "cd apps/terminal-pro && npm run test:prompt-boundary"
run_test "Search ranking test" "cd apps/terminal-pro && npm run test:search-ranking"
run_test "Plan risk test" "cd apps/terminal-pro && npm run test:plan-risk"
run_test "Plan fallback test" "cd apps/terminal-pro && npm run test:plan-fallback"
echo ""

echo "============================================"
echo "Test Summary"
echo "============================================"
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests passed!${NC}"
  echo "Ready for release."
  exit 0
else
  echo -e "${RED}Some tests failed.${NC}"
  echo "Please fix the issues before releasing."
  exit 1
fi