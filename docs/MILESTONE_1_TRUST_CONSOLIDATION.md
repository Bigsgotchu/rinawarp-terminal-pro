# Milestone 1 — Trust-Preserving Consolidation

This milestone turns the product spec into an execution checklist for the current codebase.

The goal is not "reduce file count fast." The goal is:

- keep the canonical path continuously green
- remove trust drift
- make Agent feel like home
- make proof visible in-thread

## Protected Paths

These paths are protected during cleanup. If a change weakens any of them, it is a regression even if the code gets smaller.

- Canonical renderer/workbench path
  - `apps/terminal-pro/src/renderer/workbench/store.ts`
  - `apps/terminal-pro/src/renderer/workbench/render.ts`
  - `apps/terminal-pro/src/renderer/renderer.prod.ts`
- Consolidated IPC registration path
  - `apps/terminal-pro/src/main/ipc/registerConsolidatedIpcHandlers.ts`
- Blessed execution path
  - plan execution -> receipts/session artifacts -> `RunModel` -> thread UI
- Main-authoritative workspace root
  - workspace root must come from main-process state only
- Proof lane
  - `npm --prefix apps/terminal-pro run test:e2e:proof`

## Milestone Objective

When this milestone is complete:

- Agent thread is the unquestioned home screen
- inspectors are clearly secondary
- every meaningful run appears inline beneath the message that caused it
- no success-looking state appears without proof
- legacy surfaces are disabled before deletion

## Scope

### In scope

- Truth HUD + proof presentation contract
- chat-to-run linkage hardening
- renderer/UI narrowing away from terminal-first behavior
- IPC narrowing for compatibility-only surfaces
- trust-proof verification updates

### Out of scope

- new execution engines
- new IPC architecture
- major backend rewrites
- team/agency workflow features
- new monetization/tier logic

## Current Canonical File Targets

### Thread and store truth

- `apps/terminal-pro/src/renderer/workbench/store.ts`
  - preserve `ChatMessage.runIds`
  - preserve `RunModel.originMessageId`
  - keep run/message repair during hydration
- `apps/terminal-pro/src/renderer/workbench/render.ts`
  - Truth HUD
  - inline Run Block rendering
  - degraded placeholders for unresolved run ids
- `apps/terminal-pro/src/renderer/workbench/proof.ts`
  - proof invariant helpers

### Canonical renderer behavior

- `apps/terminal-pro/src/renderer/renderer.prod.ts`
  - canonical prompt handling
  - run creation/linking
  - plan execution entry
  - proof-safe success language
- `apps/terminal-pro/src/renderer/actions/actionController.ts`
  - inspector opening only
  - no separate execution truth

### Legacy narrowing targets

- `apps/terminal-pro/src/renderer/legacyRenderer.ts`
  - removed after direct prod boot, trust smoke, and proof lane stayed green

### UI shell

- `apps/terminal-pro/src/renderer.html`
- `apps/terminal-pro/src/renderer/renderer.css`

### IPC and workspace authority

- `apps/terminal-pro/src/main/ipc/registerConsolidatedIpcHandlers.ts`
- `apps/terminal-pro/src/main/ipc/index.ts`
- `apps/terminal-pro/src/preload.ts`
- `docs/IPC_NARROWING_INVENTORY.md`

## Acceptance Criteria

### A. Agent-first home

- [x] Agent is the default home screen after boot and restore
- [x] composer prompt says `Tell Rina what to do`
- [x] starter intents exist directly under the composer:
  - [x] Build this project
  - [x] Run tests
  - [x] Deploy
  - [x] Fix what’s broken
- [x] no terminal prompt or command box appears as the primary CTA

### B. Truth HUD

- [x] Truth HUD renders at the top of the Agent thread
- [x] HUD shows:
  - [x] Workspace
  - [x] Mode
  - [x] Last run
  - [x] IPC
  - [x] Renderer
- [x] workspace value comes from main-authoritative state only
- [x] last run is derived from `RunModel`, not raw stream output
- [x] HUD updates reactively from store state

### C. Chat-to-run linkage

- [x] every execution created from a Rina message sets `RunModel.originMessageId`
- [x] owning `ChatMessage.runIds` updates from store state only
- [x] inline Run Blocks are derived by joining `runIds` to `RunModel.id`
- [x] unresolved run ids render degraded placeholders instead of disappearing
- [x] restored runs reattach to owning messages when possible

### D. Proof-safe presentation

- [x] common build/test/deploy results render as opinionated Rina cards
- [x] no raw JSON-like payloads in common success cases
- [x] no UI uses `Done`, `Completed`, `Fixed`, `Deployed`, or `Passed` without proof
- [x] success-looking states require:
  - [x] run id
  - [x] non-running terminal state
  - [x] exit code when applicable
  - [x] receipt/session indicator
- [x] missing proof degrades to:
  - [x] Running
  - [x] Interrupted
  - [x] Failed
  - [x] Proof pending
  - [x] Unverified output

### E. Inspectors as projections

- [x] Runs inspector reads the same `RunModel` entries visible in-thread
- [x] Execution Trace remains secondary and background-only
- [x] opening an inspector never creates execution records
- [x] closing an inspector never hides thread proof

### F. IPC narrowing

- [x] consolidated IPC remains the active product path
- [x] compatibility-only IPC channels are identified and marked deprecated
- [x] renderer entry points stop using deprecated channels where canonical alternatives exist
- [x] sender-aware and workspace-safe behavior remains intact

### G. Disable-first cleanup

- [x] redundant primary UI affordances are disabled before deletion
- [x] deprecated renderer/IPC surfaces are easy to roll back during narrowing
- [x] lightweight logging or explicit notes exist where legacy paths are still intentionally hit
- [x] no hard deletion happens before proof remains green

## Deletion Gate

A disabled legacy surface may be hard-deleted only when all of the following are true:

- [x] `npm --prefix apps/terminal-pro run build:electron` succeeds
- [x] `npm --prefix apps/terminal-pro run test:e2e:proof` succeeds
- [x] trust smoke or equivalent run-backed verification succeeds
- [x] no primary user flow depends on the disabled path
- [x] inspector behavior still works through canonical state

## Verification

### Required commands

```bash
npm --prefix apps/terminal-pro run test:unit -- --run tests/unit/workbench-store.restore.test.ts
npm --prefix apps/terminal-pro run build:electron
npm --prefix apps/terminal-pro run test:trust-smoke
npm --prefix apps/terminal-pro run test:e2e:proof
```

### Manual verification

1. Launch the app and confirm Agent is the first obvious action surface.
2. Trigger `Build this project`, `Run tests`, and `Deploy` from the Agent thread.
3. Confirm each flow creates or links a `RunModel` visible inline under the owning message.
4. Confirm the Truth HUD updates workspace and last-run state from real run changes.
5. Confirm no success wording appears without run proof.
6. Confirm inspectors only inspect existing run state and do not create new execution truth.

## Implementation Order

1. Lock Truth HUD and proof presentation in canonical renderer.
2. Audit all user-visible execution entry points against the blessed path.
3. Downgrade or disable paths that emit output without run proof.
4. Narrow renderer affordances that still imply terminal-first behavior.
5. Narrow compatibility IPC surfaces.
6. Run proof verification.
7. Delete only after the gate stays green.

## Decision Rule

A change in this milestone is a win only if it improves at least one of:

- comprehension
- proof trust
- canonical-path clarity
- cleanup safety

without regressing the others.
