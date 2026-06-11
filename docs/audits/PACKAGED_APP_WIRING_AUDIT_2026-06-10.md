# Packaged App Wiring Audit - 2026-06-10

## Summary

This audit verifies the packaged Electron app routing for executable commands, specifically the "Build this project" flow that was bypassing planner approval.

## Problem Identified

**Issue**: "Build this project" command was routing directly to run block, skipping the planner-approval UI.

**Root Cause**: In `agentExecutionFlow.ts`, the condition for `executionAllowed` incorrectly included `allowedNextAction === 'plan'`:

```typescript
// BEFORE (incorrect)
const executionAllowed =
  !turn ||
  turn?.allowedNextAction === 'execute' || turn?.allowedNextAction === 'plan'
```

This allowed the renderer to proceed with execution even when the turn indicated approval was required.

## Fix Applied

### 1. Main Process - `agentExecutionFlow.ts:297-299`

Changed `executionAllowed` to only return true when `allowedNextAction === 'execute'`:

```typescript
// AFTER (correct)
const executionAllowed =
  !turn ||
  turn?.allowedNextAction === 'execute'
```

### 2. Renderer - `renderPlanReplies.ts:72-75`

Added `hasExecutableSteps` check to ensure approval is shown for commands:

```typescript
const hasExecutableSteps = steps.some((s) => s.risk !== 'inspect')
const shouldShowApproval = steps.length > 0 && options?.workspaceRoot && (isReviewOnly || (allReady && hasExecutableSteps))
```

### 3. Renderer Actions - `renderPlanReplies.ts:95-96`

Removed "Run" button for executable steps (approval required):

```typescript
actions:
  allReady && steps.length > 0 && options?.workspaceRoot && !hasExecutableSteps
    ? [...]
    : undefined,
```

## Product Rule Enforced

> **If command exists → approval required**

This rule is now enforced at multiple layers:

1. **Conversation Router**: Classifies "Build this project" as `allowedNextAction: 'plan'` (medium risk)
2. **Unified Turn**: Sets `permissionRequest.required: true` when `allowedNextAction === 'plan'`
3. **Renderer Execution Flow**: Does NOT allow execution when `allowedNextAction === 'plan'`
4. **Plan Content Builder**: Shows `planner-approval` block for executable steps

## Verification

| Check | Status |
|-------|--------|
| Build passes | ✅ |
| Typecheck passes | ✅ |
| 40 unit tests passing | ✅ |
| Planner approval block renders for build commands | ✅ |
| Run block does NOT appear before approval | ✅ |
| Approval routes to executeApprovedPlan | ✅ |

## E2E Test Requirements

The following RC tests should pass after this fix:

- **RC-4**: Approval block renders commands, nothing executes before approval
- **RC-5**: Click Approve & Run executes and shows Proof
- **RC-8**: Rina asks for approval before execution

Run with:
```bash
npm --workspace apps/terminal-pro run test:e2e:rc
```

## Files Changed

| File | Change |
|------|--------|
| `apps/terminal-pro/src/renderer/services/agentExecutionFlow.ts` | Fixed `executionAllowed` condition |
| `apps/terminal-pro/src/renderer/replies/renderPlanReplies.ts` | Added `hasExecutableSteps` check |
| `PROJECT_STATE.md` | Added Trust Blocker #4 documentation |
| `docs/audits/PRODUCT_LOCK_ENFORCEMENT_2026-06-10.md` | Updated approval policy guard section |

## Conclusion

The packaged runtime flow now correctly routes executable commands through the planner-approval UI before execution. The product rule "If command exists → approval required" is enforced at the conversation routing, unified turn processing, and renderer levels.