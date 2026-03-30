# RinaWarp VS Code Consolidation Plan

Date: 2026-03-30

## Goal

Consolidate `RinaWarp Brain Pro` into `RinaWarp Companion` so there is one clear VS Code product surface.

The target end state is:

- one extension: `RinaWarp Companion`
- one account and entitlement model
- one activity bar surface
- one chat-first workflow model

## Audit Summary

`RinaWarp Brain Pro` currently provides:

- inline completion via `/api/ai/inline`
- code fixing via `/api/ai/fix`
- placeholder commands for:
  - approval flow
  - cryptographic verification
  - cloud sync
- a separate local license file and localhost validation flow

## Keep / Migrate / Drop

### Keep and migrate into Companion

- inline completion
  - this is the strongest real capability in `Brain Pro`
  - it fits the in-editor `Rina` story if it is made account-aware and observable
- fix file / fix selection
  - this can become a trusted Companion workflow if it is explicit, reversible, and scoped

### Migrate only after redesign

- approval flow
  - keep the product idea
  - do not keep the current placeholder webview implementation
  - reintroduce only when it is grounded in real actions and real approvals
- verification
  - keep as a concept tied to proof/trust
  - do not keep the current simulated success-message command
- cloud sync
  - keep only if it maps to real account/session/workspace state
  - do not keep the current placeholder command

### Drop

- local license file flow
  - obsolete now that Companion uses shared account entitlements
- localhost-only license validation
  - conflicts with the live RinaWarp account model
- duplicate panel and branding surface
  - this is product confusion, not product value

## Why Companion Should Win

`Companion` already has:

- the shared account model
- entitlement refresh
- chat
- pricing and billing handoff
- purchase-return flow
- walkthrough onboarding
- marketplace presence

That means Companion already owns the trust and activation loop.

`Brain Pro` should become a feature source, not a parallel product.

## Migration Order

### Phase 1: Product consolidation

- treat `Companion` as the only active VS Code product
- stop evolving `Brain Pro` as a separate UX surface
- remove or disable `Brain Pro` in internal testing environments where possible

### Phase 2: Capability migration

- port inline completion into Companion behind:
  - shared account state
  - trusted workspace checks where appropriate
  - telemetry and failure handling
- port fix-selection / fix-file into Companion as explicit commands

### Phase 3: Proof-aware workflow integration

- connect fix and completion features to Companion chat and diagnostics
- make them feel like part of one Rina experience instead of disconnected tools

### Phase 4: Retirement

- deprecate `Brain Pro`
- point internal docs and users to Companion only

## Acceptance Standard

Consolidation is complete when:

1. Companion is the only promoted VS Code extension
2. useful Brain Pro capabilities are available inside Companion
3. no separate local-license flow remains
4. users no longer have to guess which RinaWarp extension to install

## Immediate Next Step

Implement the first migration slice inside Companion:

- `RinaWarp: Fix Selection`
- `RinaWarp: Fix File`

These are the lowest-risk, highest-value features from `Brain Pro` to absorb next.
