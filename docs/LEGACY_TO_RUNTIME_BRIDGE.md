# LEGACY TO RUNTIME BRIDGE LAYER

## GOAL

All legacy `src/rina/` logic **MUST** route through a single adapter:

→ **`RinaRuntimeBridge`** (`apps/terminal-pro/src/runtime/bridge/RinaRuntimeBridge.ts`)

---

## RESPONSIBILITY

This module is the **ONLY** allowed bridge between:

**LEGACY SYSTEM** → **NEW RUNTIME SYSTEM**

---

## RULES

### It MAY

- convert legacy planner output → `RinaIntent`
- forward execution to `handleIngress` (via `submitRinaIntent`)
- map legacy responses → `RinaExecutionRecord` (adapter only)

### It MAY NOT

- execute LLM calls
- run CLI commands
- perform planning
- contain business logic

---

## MIGRATION RULE

All `src/rina/*` imports must eventually route through this bridge **OR** be deleted.

## BRIDGE SIZE RULE

`RinaRuntimeBridge.ts` must stay thin (~300 lines max):

- translation, forwarding, mapping only
- no business logic, no planning heuristics, no shell execution
- new computation belongs in `RinaRuntime` / `rinaIntentLoop`, not the bridge

Legacy message routing lives in `src/rina/controller/legacyInputAdapter.ts` (input-only).

---

## MIGRATION BUCKETS (PHASE 3)

| Bucket | Action | Examples |
|--------|--------|----------|
| 🟥 DELETE | Remove first | `agent/planner.ts`, duplicate agent runners, inline LLM wrappers |
| 🟨 MIGRATE | Pure functions + bridge | parsers, intent shaping, pattern matchers |
| 🟩 KEEP | Rare | UI-only types, runtime-safe utilities with no execution |

---

## TARGET ARCHITECTURE

After cleanup, only two systems exist:

1. **Runtime brain** — `handleIngress` → `RinaRuntime` → `RinaExecutionRecord`
2. **UI brain** — `RinaExecutionRecord` → display only (no execution, no LLM)
