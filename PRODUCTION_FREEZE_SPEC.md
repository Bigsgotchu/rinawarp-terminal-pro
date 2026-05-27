# 🧊 RinaWarp Terminal Pro - PRODUCTION FREEZE SPEC

**Applies To:** All code in `apps/terminal-pro/`, `packages/rina-runtime/`, `packages/rina-mcp/`

**Purpose:** Lock into single execution path to prevent prototype drift.

---

## ✅ CANONICAL RUNTIME VERIFIED

**Good News:** The canonical flow is correctly implemented:
```
UI: window.rina.agentRun()
  → preload.ts IPC
  → registerRinaIpc.ts rina:agent:run
  → submitUiPrompt() → submitRinaIntent()
  → handleIngress() (packages/rina-runtime/ipc/handleIngress.ts)
  → RinaExecutionRecord
  → UI renders (no transformation)
```

## 🔥 VIOLATIONS DETECTED (BLOCKED BY GUARDS)

### Legacy Bypass Directory
`apps/terminal-pro/src/rina/` contains code that bypasses canonical runtime:

| File | Violation | Status |
|------|-----------|--------|
| `agent/neuralPlanner.ts` | Direct `fetch('/chat/completions')` | FROZEN → bridge |
| `error-explainer.ts` | Direct OpenAI call | FROZEN → bridge |
| `planner.ts` | `runAgent` parallel path | BLOCKED |
| `agent-runner.ts` | `runAgent` bypass | **DELETED** → manifest + bridge |
| `controller/messageRuntime.ts` | tool/CLI execution | **COLLAPSED** → `legacyInputAdapter` |

### Guards in CI
- ✅ `check-no-direct-llm-calls.mjs` - Blocks external LLM calls outside `services/rina-cloud-api/`
- ✅ `check-rina-legacy.mjs` - Blocks runtime bypass patterns in `apps/terminal-pro/src/rina/`
- ✅ `guards.sh` - Updated to block direct `/chat/completions` fetch calls

---

## 🧠 UI FREEZE RULE (VERIFIED)
The UI correctly follows the "renderer only" pattern:
- ✅ `agentExecutionFlow.ts` calls `submitAnalyzeIntent()` only
- ✅ `rinaIngressClient.ts` has no execution logic
- ✅ `executionDisplay.ts` maps records only (no transformation)

---

## 📁 RUNTIME FREEZE RULE (IMPLEMENTED)

**Single Entry Point:** `handleIngress` ONLY

**Blocked if:**
- Multiple execution engines exist
- MCP → direct execution bypass
- Tool execution outside transaction system

---

## 🎯 NEXT ACTIONS (PHASED)

**Phase 1 (done):** Legacy isolation — see `docs/LEGACY_RINA_ISOLATION_PROTOCOL.md`

**Phase 2 (done):** `RinaRuntimeBridge` — see `docs/LEGACY_TO_RUNTIME_BRIDGE.md`

**Phase 3 (done):** Deleted shell executors; bridged doctor, secure agents, tools, repair planning is read-only. `legacyShell.ts` frozen except `RINAWARP_TOOL_SMOKE=1`.

### Option A: Delete Legacy (incremental)
Remove files bucket-by-bucket after callers migrate to IPC / bridge.

### Option B: Adapter Legacy (current)
All execution-shaped legacy APIs forward through:
```ts
import { submitLegacyIntentToRuntime } from '../runtime/bridge/RinaRuntimeBridge.js'
```

---

## 🏁 FINAL STATE GUARANTEE

After cleanup, the system is verified when:
1. All guards pass
2. `apps/terminal-pro/src/rina/agent/neuralPlanner.ts` does NOT exist or forwards to runtime
3. `apps/terminal-pro/src/rina/error-explainer.ts` does NOT exist or forwards to runtime
4. Only `handleIngress` produces execution records