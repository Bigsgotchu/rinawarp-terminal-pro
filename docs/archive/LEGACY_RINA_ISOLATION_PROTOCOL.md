# LEGACY RINA ISOLATION PROTOCOL

## RULE

The directory `apps/terminal-pro/src/rina/` is now classified as:

→ **LEGACY COMPATIBILITY LAYER ONLY**

---

## ALLOWED BEHAVIOR

- imported for fallback compatibility ONLY
- cannot execute LLM calls
- cannot initiate tool execution
- cannot be entry point for new flows

---

## REQUIRED MODIFICATION

All files in `src/rina/` must be modified to:

### BEFORE (FORBIDDEN)

- direct LLM calls
- planner execution
- tool execution
- agent loops

### AFTER (REQUIRED)

- pure adapters ONLY
- forward calls into `handleIngress(intent)` via `RinaRuntimeBridge` / `submitRinaIntent`

---

## RULE

If a file cannot be reduced to a pure adapter:

→ it **MUST** be scheduled for deletion (see migration buckets in `LEGACY_TO_RUNTIME_BRIDGE.md`).

---

## ENFORCEMENT

- CI: `node scripts/guards/check-rina-legacy.mjs`
- Product contract: `scripts/guards/check-product-constraint-contract.mjs`
- Bridge module: `apps/terminal-pro/src/runtime/bridge/RinaRuntimeBridge.ts`
- Input adapter: `apps/terminal-pro/src/rina/controller/legacyInputAdapter.ts`

## COLLAPSE PASS (controller layer)

These files are **input adapters only** (no shell/tools):

- `controller/messageRuntime.ts`
- `controller/repairRuntime.ts`
- `controller/legacyInputAdapter.ts`

Deleted: `agent-runner.ts` (replaced by `agents/installed-agent-manifest.ts` + bridge forward).

## Phase 3 — execution surface collapse (done)

| Action | File |
|--------|------|
| DELETE | `repair-execution.ts`, `agent/planner.ts`, `agent-runner.ts` |
| READ-ONLY plan | `repair-plan-runtime.ts` (no `tsc`/`git` shell probes) |
| BRIDGE | `doctor.ts`, `secure-agent-runner.ts`, `controller/toolRuntime.ts`, `tools/terminal.ts` |
| FROZEN | `execution/legacyShell.ts` (smoke tests only via `RINAWARP_TOOL_SMOKE=1`) |
| READ-ONLY git | `context/contextEngine.ts` (`.git/HEAD` file read) |
