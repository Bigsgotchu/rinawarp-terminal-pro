#!/bin/bash
# CI Guard: Prevent child_process imports outside tools package
#
# This script ensures all terminal/command execution happens only through
# the ToolRegistry, not via direct child_process/spawn/exec calls.

set -e

echo "🔒 Running CI guard: No child_process outside tools..."

# Check for forbidden imports in src (excluding tools directory)
FOUND=$(rg -n "child_process|spawn\(|exec\(|execa\(" packages/rinawarp-core/src \
    --glob "!**/tools/**" \
    --glob "!**/node_modules/**" \
    2>/dev/null || true)

if [ -n "$FOUND" ]; then
    echo "❌ CONTRACT VIOLATION: Found direct child_process usage outside tools package:"
    echo "$FOUND"
    echo ""
    echo "All terminal execution must go through ToolRegistry."
    echo "Move any spawn/exec code to src/tools/ directory."
    exit 1
fi

echo "✅ CI guard passed: No unauthorized child_process usage"

# Also verify no direct spawn in adapters
ADAPTER_CHECK=$(rg -n "spawn|exec" packages/rinawarp-core/src/adapters \
    --glob "!**/node_modules/**" \
    2>/dev/null || true)

if [ -n "$ADAPTER_CHECK" ]; then
    echo "❌ CONTRACT VIOLATION: Found spawn/exec in adapters:"
    echo "$ADAPTER_CHECK"
    exit 1
fi

echo "✅ Adapters are clean (no direct execution)"

exit 0
