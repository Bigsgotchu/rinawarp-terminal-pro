# Thread-First Productization

## Objective

One intelligent execution thread with embedded proof artifacts — not a pile of developer tool tabs.

## Canonical store

`apps/terminal-pro/src/workbench/store/`

- `threadTypes.ts` — `ThreadItem` union (user, assistant, plan, run-block, cognition, memory, verification, receipt)
- `threadMutations.ts` — append/upsert helpers, `resolveThreadItems`, execution → thread mapping

## Rendering truth

When `state.thread` has items for the workspace, `renderCanonicalThread()` in `renderer/workbench/renderers/threadSurface.ts` is the **only** agent output renderer.

Legacy `state.chat` is still written for IPC/indexing but not duplicated in the UI.

## Product rules

1. Agent thread is the product surface
2. Terminal / runs / trace open as **inspectors** from run-block actions (`openDrawer`)
3. Every ingress execution appends: plan → message → run block → cognition → memory → verification → receipt
4. Assistant claims require `proofBacked` or a receipt item
5. Truth HUD at top of thread when active

## Core flows

Build / test / deploy prompts route through `submitAnalyzeIntent` → `applyExecutionRecordToWorkbench` → canonical thread items.

## Golden journeys (E2E)

`apps/terminal-pro/e2e/golden/` — Playwright suite verifying thread-first proof chain:

- `build-project.spec.ts`
- `run-tests.spec.ts`
- `deploy-project.spec.ts`
- `rollback-flow.spec.ts`
- `memory-assisted-fix.spec.ts`
- `receipt-persistence.spec.ts`

Run: `pnpm --filter rinawarp-terminal-pro e2e:golden`

## Trust & receipts

- Assistant messages without proof render **Unverified** badge
- Proof-backed messages and receipts render **Verified**
- Receipt cards: Stripe-style operational summary with View logs / View diff / Replay / Copy summary
- Rollback failures include restoration storytelling (no fake “done”)
- Execution summaries use `executionSummary.ts` (what changed, duration, verification)
- Session hydration: `hydrateCanonicalThread()` rebuilds thread from chat + run blocks + persisted receipts
- Metrics: `analytics.executionMetrics` (duration, rollbacks, verification rate, build success)
