# Run Block Productization

## Goal

Execution is visible inside the agent thread as proof artifacts—not hidden in terminals or side panels.

## Canonical model

`apps/terminal-pro/src/workbench/runBlocks/`

- `types.ts` — `RunBlock`, `ExecutionReceipt`, cognition timeline types
- `fromExecutionRecord.ts` — maps `RinaExecutionRecord` → run block + receipt
- `cognitionStream.ts` — real runtime event labels (no fake typing)
- `receiptPersistence.ts` — local receipt store for trust UX

## Thread order (ingress path)

1. User message
2. Plan card (when runtime returns a plan)
3. Inline **RunBlock** (linked via `runIds`)
4. Cognition stream + memory note (in message + on run block)
5. Verification + receipt summary

## Inspectors (secondary)

- Terminal / execution trace = **inspect output only**
- Run block owns status, receipt, cognition, and proof actions

## Truth HUD

Rendered at top of agent thread when conversation has content (`rw-truth-hud`).

## Proof actions (inline run block)

- View logs · View receipt · View diff · Replay run · Open workspace folder
