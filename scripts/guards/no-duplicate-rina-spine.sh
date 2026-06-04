#!/usr/bin/env bash
set -euo pipefail

echo "Checking for duplicate RinaWarp spine definitions..."

PRELOAD_COUNT=$(grep -R 'exposeInMainWorld(["'"'"']rina["'"'"']' apps/terminal-pro/src --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v dist-electron | wc -l | tr -d ' ')

if [ "$PRELOAD_COUNT" -ne 1 ]; then
  echo "Expected exactly one contextBridge.exposeInMainWorld('rina', ...) definition, found $PRELOAD_COUNT"
  exit 1
fi

if grep -R "executeApprovedCommand" apps/terminal-pro/src --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "executionController.ts" | grep -v "diagnostics/" | grep -v ".test.ts" | grep -v dist-electron; then
  echo "Found deprecated executeApprovedCommand usage outside executionController. Approval must use window.rina.approveRun()."
  exit 1
fi

if grep -R "rina:run-agent" apps packages --include="*.ts" --include="*.tsx" --include="*.js" --include="*.mjs" 2>/dev/null | grep -v dist-electron; then
  echo "Found deprecated channel rina:run-agent. Use rina:agent:run."
  exit 1
fi

if grep -R "type ExecutionReceipt\|interface ExecutionReceipt" apps packages --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "packages/rina-contracts/src/index.ts" | grep -v "runBlocks/types.ts" | grep -v dist-electron | grep -v node_modules | grep -v "/dist/"; then
  echo "Found duplicate ExecutionReceipt type outside rina-contracts."
  exit 1
fi

if grep -R "receipt\.commandsExecuted\|receipt\.filesChanged\|receipt\.verificationResults\|receipt\.runId" apps packages \
  --include="*.ts" \
  --include="*.tsx" \
  2>/dev/null \
  | grep -v "receiptCompat.ts" \
  | grep -v ".test." \
  | grep -v dist-electron \
  | grep -v node_modules \
  | grep -v "/dist/"; then
  echo "Found legacy receipt field access outside receiptCompat.ts."
  exit 1
fi

echo "No duplicate RinaWarp spine definitions found."
