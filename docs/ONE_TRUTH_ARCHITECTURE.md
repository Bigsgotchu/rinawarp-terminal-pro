# RinaWarp One Truth Architecture

RinaWarp Terminal Pro is not being rebuilt from scratch.

The product source of truth is:

chat → plan → execute → stream → verify → receipt → memory

## Ownership

### apps/terminal-pro

Owns the primary product UI:
- Agent Thread
- plan blocks
- run blocks
- verification blocks
- receipt blocks
- inspect drawers

It does not own execution logic.

### packages/rinawarp-agentd

Owns:
- natural-language routing
- LLM provider interface
- intent parsing
- plan generation
- conversation mode decisions

It is the agent brain.

### packages/rina-runtime

Owns:
- execution lifecycle
- safety gate coordination
- event stream normalization
- verification step
- receipt generation
- memory update trigger

It is not a second agent brain.

### packages/rinawarp-tools

Owns:
- PTY command execution
- stdout/stderr streaming
- timeouts
- process lifecycle

### packages/rinawarp-safety

Owns:
- command risk classification
- mutation boundaries
- approval requirements
- blocked action decisions

### packages/rina-mcp

Owns:
- MCP server/tool calls
- MCP traces
- MCP tool receipts

### SQLite

Owns durable proof:
- sessions
- runs
- command logs
- receipts
- verification results
- execution memory

### apps/rinawarp-companion

Owns VS Code context collection only:
- active file
- selected text
- diagnostics
- workspace root
- Git state

It must not execute commands, call LLMs, apply patches, or maintain a separate agent loop.

## Non-Negotiable Product Invariant

No real work may happen silently.

Every executable action must produce:
- visible plan
- execution stream
- verification result
- durable receipt

## Forbidden Bypasses

The following are not allowed in MVP:

- direct OpenAI/Anthropic calls outside rinawarp-agentd
- command execution outside rinawarp-tools
- filesystem mutation outside runtime safety policy
- VS Code command execution outside Terminal Pro runtime
- standalone fix-code APIs
- standalone summarize commands
- persona chat modes that do not produce proof
- hidden automation without receipts

## Allowed Refactor

Existing features may remain only if they are routed through:

Agent Thread → agentd → runtime → safety → tools/MCP → verifier → receipt → memory

## Definition of Done

The architecture is correct when every user-facing action can answer:

1. What did Rina understand?
2. What was the plan?
3. What actions ran?
4. What output streamed?
5. What verified success or failure?
6. What receipt proves it?
7. What memory was updated?

## Phase 1 Completion Status

Phase 1 is complete.

Verified:
- Shared runtime contracts build.
- Canonical runtime builds.
- Terminal Pro preload exposes the canonical `rina` bridge inline.
- Product-realness guards pass.
- `runAgent()` emits the full lifecycle event chain.
- SQLite receipt persistence works.
- Smoke test reaches `memory_updated`.
- Terminal Pro Electron build passes.

Known issue:
- The smoke run now gets past the previous `process.cwd()` guard violation.
- The inner project test command now gets past `guard:no-legacy-contracts`.
- The current inner project test failure is a local Node test-runner failure in `apps/rinawarp-companion`: `Missing internal module 'internal/deps/brace-expansion'`.
- This is correctly captured as a failed receipt and does not invalidate the architecture.

Next phase:
- Continue product hardening by resolving the remaining guard failures and hardening runtime behavior.

## Phase 2 Hardening Status

Phase 2 has started.

Verified:
- Main-process `process.cwd()` guard violations were removed.
- Workspace cwd access now routes through `resolveSharedWorkspaceCwd()`.
- `scripts/guards/guards.sh` passes.
- Legacy Matter Intelligence user-facing links were removed from active public navigation and product copy.
- Legacy Matter Intelligence routes now redirect to current product/support/docs/download routes.
- `guard:no-legacy-contracts` passes.
- Playwright verified the rendered `/products` page has current Terminal Pro proof copy and no active `/matter-intelligence` links.
- Playwright verified legacy Matter Intelligence routes land on current routes after redirect.
- `smoke:agent` reaches `memory_updated`.
- New SQLite receipt persisted: `65a7bc8d-bc2a-439f-97a0-f399832d6096`.
- Terminal Pro Electron build passes.

Current hardening failure:
- The inner project test now fails in `apps/rinawarp-companion` during `node --test tests/*.test.cjs`.
- Node reports `Missing internal module 'internal/deps/brace-expansion'` before companion tests execute.
- This is correctly streamed, verified, and saved as a failed receipt, proving the product spine remains intact.

Next:
- Fix or route around the local Node test-runner issue so companion tests can execute normally.

## Phase 2 Companion Test Runner Hardening

Verified:
- Legacy Matter Intelligence contract drift is fixed.
- Playwright proof validates rendered product copy and redirects.
- Terminal Pro build continues to pass.
- RinaWarp receipts remaining failures correctly.
- Companion tests avoid the broken `node --test` CLI path.
- `corepack pnpm --filter rinawarp-companion test` runs 38 Companion tests successfully.
- Root `corepack pnpm test` now gets past Companion and fails at real Terminal Pro unit assertions instead of Node internals or missing script aliases.
- `corepack pnpm smoke:agent` reaches `memory_updated`.
- New SQLite receipt persisted: `abe8ac88-68fe-48c9-aa98-ad9eaefd0ba3`.

Fix:
- Companion tests now use an explicit `tests/index.test.cjs` entrypoint.
- The Companion test script runs that entrypoint with plain `node`, avoiding the local Node `internal/deps/brace-expansion` runner failure.
- Terminal Pro now defines the `test:unit`, `test:agent`, and `test:cli` script aliases expected by the root test command.

Current issue resolved:
- `corepack pnpm test` now passes all Terminal Pro unit assertions.
- Test expectation drift in `apps/terminal-pro/tests/agent.test.mjs` was fixed: prototype-era phrasing expectations were updated to match natural teammate-style product language.

## Phase 2 Unified Turn Test Alignment

Verified:
- `unified-turn.test.ts` now matches the one-truth execution model.
- Executable mixed prompts route to `execute`, not legacy `mixed`.
- User-facing reply expectations use natural teammate-style product language.
- Failed build recovery plans are inspect-first and low-risk.
- Prototype-era `Action:` phrasing and unconditional `pnpm install` expectations were removed.

Success criteria:
- Terminal Pro unit tests pass.
- Full repo tests advance past unified-turn expectation drift.
- `smoke:agent` still reaches `memory_updated`.
- A new SQLite receipt is persisted.

## Phase 2 Verification Complete

Phase 2 verification is complete.

Verified:
- Terminal Pro unit tests pass: 34 tests.
- Full repository tests pass: 126 tests.
- `smoke:agent` reaches `memory_updated`.
- Terminal Pro Electron build succeeds.
- SQLite receipt persistence is verified.

Latest successful receipt:
- `44e03d4c-0578-4f8f-8c4e-569b770d8714`
- Workspace: `smoke-test-workspace`
- Status: `succeeded`
- Verification: `passed`
- Summary: `Completed: Rina, run tests. Verification passed.`

Product truth:
- RinaWarp now has a verified one-truth execution spine:
  `chat → plan → execute → stream → verify → receipt → memory`.

Next phase:
- Product UX hardening (Phase 3):
  - polish Agent Thread blocks
  - add approval UI for medium/high-risk actions
  - add git diff capture into receipts
  - add recovery suggestions when verification fails
  - add Playwright/Electron UI test proving:
    user input → plan block → run block → verification block → receipt block

## Phase 3 Approval UI Wiring

Verified:
- `approval_required` timeline event emitted with risk level and reasons.
- AgentThread.tsx renders approval block with risk badge and action buttons.
- `approvalRequired` field in `HandleUserTurnResult` carries risk info to UI.

## Phase 3 Receipt Compatibility Cleanup

Verified:
- Legacy receipt shapes are now read through receipt compatibility helpers.
- Canonical receipt usage remains `commands`, `fileChanges`, `verification.checks`, and `id`.
- Workbench hydration, thread mutation, replay, and receipt persistence no longer directly depend on legacy receipt fields.
- Runtime string arrays and legacy string file changes are adapted at the boundary.
- Terminal Pro Electron build passes.

Rule:
- Legacy receipt fields may only be read inside the receipt compatibility adapter.
- New code must use the canonical `ExecutionReceipt` shape from `rina-contracts`.

Risk summary structure:
```typescript
risk: {
  level: 'low' | 'medium' | 'high'
  reasons: string[]
  requiresApproval: true
}
```

Status: Implemented, build passing, tests passing.

Next steps:
- Wire approval action buttons to IPC handlers.
- Persist approval decision in SQLite receipt.

## Phase 3 Diff Receipt Capture

Verified:
- `DiffSummary` type extended with `hint` field for diff stat preview.
- `executionReceiptFromRecord` captures risk info including level and reasons.
- Receipt now includes optional `risk` field with approval structure.

Structure:
```typescript
commands: string[]
fileChanges: string[]
hint?: string  // diff stat preview
unifiedDiff?: string
```

Status: Implemented in `fromExecutionRecord.ts`.

## Phase 3 Failed-Run Recovery Block

Existing infrastructure:
- `bindRunActions.ts` already has `[data-run-fix]` handler that generates recovery prompts.
- `buildInterruptedRunRecoveryPrompt` in `conversationOwner.ts` creates recovery prompts.

Next:
- Wire failed verification events to trigger recovery suggestion blocks.
- Ensure recovery prompts follow the same approval/flow loop.

## Phase 3 Agent Thread UX Polish

Changes made:
- `AgentThread.tsx` now renders `approval` block type with risk badge.
- Approval block shows risk level (low/medium/high) and reasons.
- Action buttons: `[Approve and run]` and `[Cancel]`.

Next:
- Add click handlers for approval buttons.
- Link approval decisions to execution.

## Phase 3 Playwright Proof Test

Existing test: `tier1-product-smoke.spec.ts` proves:
- user input → plan block → run block → receipt block

Requirements:
- Add assertion for `approval_required` event on risky commands.
- Verify execution does not start before approval.
- Add test for approval flow with user approval action.
