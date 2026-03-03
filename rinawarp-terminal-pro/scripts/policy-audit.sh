#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "[policy-audit] Execution handlers calling evaluatePolicyGate:" 
rg -n "evaluatePolicyGate\(" apps/terminal-pro/src/main.ts

echo "[policy-audit] Main execution entrypoints:" 
rg -n "rina:executeStepStream|rina:executePlanStream|rina:pty:write|rina:doctor:collect|rina:doctor:executeFix" apps/terminal-pro/src/main.ts

echo "[policy-audit] Renderer preflight paths:" 
rg -n "preflightPolicy|preflightPlanPolicy|runTerminalCommand|runPlan\(|runStep\(" apps/terminal-pro/src/renderer.html

echo "[policy-audit] done"
