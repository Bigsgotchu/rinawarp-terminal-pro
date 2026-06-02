# Thread Block Contract for RinaWarp Terminal Pro

## Purpose
This document establishes the contract for how Thread Blocks operate within the RinaWarp Terminal Pro system, ensuring consistency between execution, verification, and user-facing outputs.

## Core Principles

### 1. Single Source of Truth
The canonical thread in `apps/terminal-pro/src/workbench/store/` is the definitive record of all user interactions and system executions. All other representations (chat, IPC, indexing) are secondary and may be derived from but cannot contradict the canonical thread.

### 2. Execution Sequence Integrity
Every user-initiated execution must follow this exact sequence:
1. **plan** - What will be done
2. **message** - Explanation to user  
3. **run-block** - The actual execution container
4. **cognition** - AI reasoning about the execution
5. **memory** - What was learned or retrieved
6. **verification** - Proof that execution completed as intended
7. **receipt** - User-facing summary of outcomes

### 3. Proof Requirements
- Assistant messages **must** have either `proofBacked: true` or an associated receipt item to be considered verified
- Messages without proof display an "Unverified" badge in the UI
- Only verification-backed execution results can be used for subsequent context

### 4. Truth HUD Contract
When the state.thread contains items for the current workspace:
- `renderCanonicalThread()` in `renderer/workbench/renderers/threadSurface.ts` is the **exclusive** renderer for agent output
- No other UI component may render agent execution results as primary content
- Legacy `state.chat` is maintained only for IPC/indexing purposes, never for UI rendering

### 5. Thread Item Types
The `ThreadItem` union in `threadTypes.ts` defines the contractually valid types:
- `user`: User input
- `assistant`: AI response (requires proof for verification)
- `plan`: Execution intention
- `run-block`: Execution container
- `cognition`: AI reasoning process
- `memory`: Retrieved or learned information
- `verification`: Proof of execution correctness
- `receipt`: User-facing outcome summary

### 6. Ingress Contract
All execution ingress points (build/test/deploy prompts, fix flows, etc.) must:
- Route through `submitAnalyzeIntent`
- Apply execution record via `applyExecutionRecordToWorkbench`
- Result in properly ordered canonical thread items
- Never bypass the thread-first pipeline

### 7. E2E Validation Contract
Golden journey tests in `apps/terminal-pro/e2e/golden/` must verify:
- Correct sequence of thread item types
- Presence of verification artifacts for all actions
- Proper receipt generation and persistence
- Accurate rollback failure storytelling (no false success claims)
- Session hydration correctly rebuilds thread from persisted artifacts

### 8. Trust & Verification Contract
- Metrics must track: duration, rollback rates, verification frequency, build success rates
- Receipt cards must follow Stripe-style operational summary format
- All verification artifacts must be cryptographically verifiable or logically provable
- System must never claim success without corresponding verification evidence

## Implementation Requirements

### Rendering Layer
- Only `renderCanonicalThread()` may display agent outputs as primary content
- Secondary displays (inspectors, drawers) may show supplementary information
- Legacy chat rendering must be strictly segregated from agent output rendering

### State Management
- `threadMutations.ts` provides the only sanctioned methods for thread modification
- Direct state mutations outside these helpers violate the contract
- All thread modifications must be traceable to specific execution ingress points

### Persistence Layer
- Session hydration via `hydrateCanonicalThread()` must rebuild thread from:
  - Persisted chat data
  - Run block artifacts  
  - Persisted receipt items
- Hydration must preserve exact thread item sequence and types
- No information loss during hydration cycle

## Violation Consequences
Any deviation from this contract results in:
- Loss of verification capability
- Inconsistent user experience between thread and UI
- Potential for unverified AI claims to appear as facts
- Breakdown of audit and reproducibility guarantees
- Invalid E2E test results
- Compromised trust in system outputs

## Evolution Governance
Changes to this contract require:
1. Documentation update in this file
2. Corresponding updates to `threadTypes.ts` and `threadMutations.ts` 
3. Updates to `renderCanonicalThread()` and related renderers
4. Updates to `applyExecutionRecordToWorkbench()` and ingress points
5. Updates to E2E test suites in `apps/terminal-pro/e2e/golden/`
6. Review and approval by architecture oversight