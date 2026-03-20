# IPC Narrowing Inventory

This inventory exists to support Milestone 1 cleanup without breaking the protected path.

The goal is not to delete channels immediately. The goal is to make the active product path obvious and to mark compatibility-only surfaces so they can be disabled before deletion.

## Canonical Product Path

These IPC surfaces are part of the current blessed product path and should remain protected during Milestone 1.

### Core renderer/workbench execution

- `rina:workspace:default`
- `rina:getMode`
- `rina:setMode`
- `rina:getStatus`
- `rina:getPlans`
- `rina:getTools`
- `rina:runAgent`
- `rina:agent:plan`
- `rina:executePlanStream`
- `rina:capabilities:execute`

### Proof and inspection

- `rina:runs:list`
- `rina:runs:tail`
- `rina:revealRunReceipt`
- `rina:openRunsFolder`
- `rina:code:listFiles`
- `rina:code:readFile`
- `rina:brain:stats`

### Canonical event streams

- `rina:thinking`
- `rina:stream:chunk`
- `rina:stream:end`
- `rina:plan:stepStart`
- `rina:plan:run:start`
- `rina:plan:run:end`
- `rina:brain:event`

### Capability and commercial surfaces

- `rina:capabilities:list`
- `secure-agent:marketplace`
- `secure-agent:list`
- `secure-agent:install`
- `license:verify`
- `license:refresh`
- `license:state`
- `license:checkout`
- `license:portal`
- `license:lookup`
- `license:email`
- `analytics:trackEvent`
- `rina:analytics:funnel`

## Compatibility-Only Surfaces

These are compatibility or legacy-oriented surfaces that must not drive the primary product path.

Some have already been removed from preload or main registration. The remaining ones should stay explicitly non-canonical until they can be deleted.

### Legacy/system/dev helpers

- `rina:status`
- `rina:executePlan`
- `rina:getProgress`
- `rina:subscribeEvents`
- `rina:getMemoryStats`
- `rina:clearSession`
- `daemon:*`
- `utility:ping`
- `utility:devtoolsToggle`
- `shell:getKind`

### Legacy PTY compatibility

- legacy `pty:*` compatibility handlers have been removed from main registration

Note:

- `rina:pty:*` remains available as a low-level execution/inspection substrate.
- PTY should not be treated as a primary user workflow surface.

## Narrowing Rules

### Keep

Keep canonical channels stable while cleanup is in progress.

### Mark deprecated

Compatibility-only channels should be explicitly marked in code comments and internal docs as deprecated compatibility surfaces.

### Disable entry points first

Before deleting a compatibility channel:

- remove UI entry points that call it
- stop exposing it as a primary workflow
- verify canonical replacements exist and are green

### Delete only after proof stays green

A compatibility channel can be removed only after:

- `npm --prefix apps/terminal-pro run build:electron`
- `npm --prefix apps/terminal-pro run test:e2e:proof`

remain green and no primary flow depends on it.

## Immediate Milestone 1 Follow-up

1. Keep `window.rina` as the canonical renderer bridge.
2. Keep `registerConsolidatedIpcHandlers.ts` as the primary product registration path.
3. Keep renderer access narrowed to the `window.rina` canonical bridge.
4. Continue quarantining or deleting remaining non-canonical handlers in `apps/terminal-pro/src/main/ipc/index.ts` only after proof stays green.
