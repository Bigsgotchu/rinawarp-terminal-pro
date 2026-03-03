# IPC Extraction Roadmap

## Current State

IPC extraction from `main.ts` is complete. Registration is centralized in `src/main/ipc/registerAllIpc.ts`.

Recent completed extraction:
- `rina:license:*` extracted to `src/main/ipc/registerLicenseIpc.ts`
- `rina:themes:*` extracted to `src/main/ipc/registerThemesIpc.ts`
- `rina:memory:*` extracted to `src/main/ipc/registerMemoryIpc.ts`
- `rina:personality:*` extracted to `src/main/ipc/registerPersonalityIpc.ts`
- `rina:policy:*` extracted to `src/main/ipc/registerPolicyIpc.ts`
- `rina:pty:*` extracted to `src/main/ipc/registerPtyIpc.ts`
- `rina:daemon:*` extracted to `src/main/ipc/registerAgentIpc.ts`
- `agent:plan` and `rina:agent:plan` extracted to `src/main/ipc/registerAgentPlanningIpc.ts`
- `rina:executePlanStream` and `agent:execute` extracted to `src/main/ipc/registerAgentExecutionIpc.ts`
- `rina:orchestrator:*` extracted to `src/main/ipc/registerOrchestratorIpc.ts`

## Guardrails in Place

1. **Duplicate IPC Detection** (`scripts/check-duplicate-ipc.js`)
   - Scans all source files for `ipcMain.handle()` and `ipcMain.on()` calls
   - Fails CI if duplicate channel names are found
   - Run locally: `node scripts/check-duplicate-ipc.js`

2. **No IPC in main.ts** (`scripts/check-no-ipc-in-main.sh`)
   - Bans `ipcMain.handle()` and `ipcMain.on()` from `main.ts`
   - **NOT YET ENABLED IN CI** - will be enabled after extraction is complete
   - Run locally: `./scripts/check-no-ipc-in-main.sh`

3. **Runtime Double-Registration Guard** (`src/main/ipc/registerAllIpc.ts`)
   - Prevents accidental double-registration during hot reload
   - Uses `globalThis.__rinaIpcRegistered` flag

## Extraction Pattern

Each module should follow this pattern:

```typescript
// src/main/{domain}/register{Domain}Ipc.ts
import type { IpcMain } from "electron";
import type { AppContext } from "../context.js";

export function register{Domain}Ipc(args: {
  ipcMain: IpcMain;
  ctx: AppContext;
  // ... other dependencies
}): void {
  const { ipcMain } = args;
  
  ipcMain.handle("domain:action", async (_event, ...args) => {
    // handler implementation
  });
}
```

Then in `registerAllIpc.ts`:

```typescript
import { register{Domain}Ipc } from "../{domain}/register{Domain}Ipc.js";

export function registerAllIpc(args: { ... }) {
  if (globalThis.__rinaIpcRegistered) return;
  globalThis.__rinaIpcRegistered = true;

  registerDiagnosticsIpc(args);
  register{Domain}Ipc(args);
  // ... other modules
}
```

## Extraction Order (Recommended)

### Phase 1: Self-Contained Modules (Low Risk)

| Module | Handlers | Channels | Status |
|--------|----------|----------|--------|
| License | 4 | `license:verify`, `license:state`, `license:portal`, `license:lookup` | Completed |
| Themes | 5 | `rina:themes:*` | Completed |
| Memory | 2 | `rina:memory:*` | Completed |
| Personality | 2 | `rina:personality:*` | Completed |

### Phase 2: Core Features (Medium Risk)

| Module | Handlers | Channels | Status |
|--------|----------|----------|--------|
| PTY | 6 | `rina:pty:*` | Completed |
| Policy | 3 | `rina:policy:*`, `rina:redaction:*` | Completed |
| Transcript | 5 | `rina:transcript:*`, `rina:structured:*` | Completed (`registerSessionIpc.ts`) |
| Search | 2 | `rina:search:*`, `rina:structured:search` | Completed (`registerSessionIpc.ts`) |

### Phase 3: Complex Features (Higher Risk)

| Module | Handlers | Channels | Status |
|--------|----------|----------|--------|
| Doctor | 6 | `rina:doctor:*` | Completed (`registerDoctorIpc.ts`) |
| Plan/Execute | 4 | `rina:plan:*`, `rina:execute*` | Completed (`registerAgentExecutionIpc.ts`, `registerUtilityIpc.ts`) |
| Stream | 4 | `rina:stream:*` | Completed (`registerAgentExecutionIpc.ts`) |
| Share | 5 | `rina:share:*` | Completed (`registerShareIpc.ts`) |
| Team | 4 | `rina:team:*` | Completed (`registerTeamIpc.ts`) |
| Export | 3 | `rina:export:*` | Completed (`registerExportIpc.ts`) |

### Phase 4: Remaining Handlers

| Module | Handlers | Channels | Status |
|--------|----------|----------|--------|
| Workspace | 3 | `rina:workspace:*`, `rina:pickDirectory` | Completed (`registerWorkspaceIpc.ts`) |
| Code Explorer | 2 | `rina:code:*` | Completed (`registerCodeIpc.ts`) |
| History | 1 | `rina:history:*` | Completed (`registerHistoryIpc.ts`) |
| Chat | 2 | `rina:chat:*` | Completed (`registerChatIpc.ts`) |
| Agent | 8 | `agent:*`, `rina:agent:*`, `rina:daemon:*` | Completed |
| Orchestrator | 6 | `rina:orchestrator:*` | Completed |
| Misc | ~12 | Various single handlers | Pending |

## Handler Inventory (from main.ts)

```
Line 1970: rina:devtools:toggle
Line 2269: license:verify
Line 2287: license:state
Line 2298: license:portal
Line 2450: license:lookup
Line 2471: rina:pickDirectory
Line 2486: rina:workspace:pick
Line 2500: rina:workspace:default
Line 2506: rina:code:listFiles
Line 2516: rina:code:readFile
Line 2532: rina:pty:start
Line 2599: rina:pty:write
Line 2651: rina:pty:resize
Line 2674: rina:pty:metrics
Line 2689: rina:pty:stop
Line 2697: rina:ping
Line 2701: rina:history:import
Line 2710: rina:renderer:error
Line 2724: rina:diagnoseHot
Line 2729: rina:plan
Line 2736: rina:playbooks:get
Line 2751: rina:playbook:execute
Line 2773: rina:transcript:get
Line 2774: rina:transcript:export
Line 2775: rina:transcript:add
Line 2776: rina:structured:status
Line 2782: rina:structured:runbook:export
Line 2789: rina:structured:runbook:preview
Line 2805: rina:structured:runbook:json
Line 2809: rina:structured:search
Line 2813: rina:search:unified
Line 2816: rina:structured:detect-boundaries
Line 2819: rina:policy:env
Line 2822: rina:support:bundle
Line 2858: rina:policy:explain
Line 2861: rina:redaction:preview
Line 2869: rina:export:preview
Line 2933: rina:export:publish
Line 2967: rina:share:preview
Line 3000: rina:share:create
Line 3049: rina:share:list
Line 3064: rina:share:get
Line 3074: rina:share:revoke
Line 3086: rina:team:get
Line 3087: rina:team:setCurrentUser
Line 3098: rina:team:upsertMember
Line 3111: rina:team:removeMember
Line 3132: rina:audit:export
Line 3135: rina:themes:list
Line 3138: rina:themes:get
Line 3141: rina:themes:set
Line 3149: rina:themes:custom:get
Line 3152: rina:themes:custom:upsert
Line 3161: rina:themes:custom:delete
Line 3167: rina:memory:get
Line 3168: rina:memory:set
Line 3173: rina:personality:reply
Line 3191: rina:personality:prefix
Line 3208: rina:executeStepStream
Line 3433: rina:stream:cancel
Line 3434: rina:stream:kill
Line 3619: rina:plan:stop
Line 3663: rina:doctor:inspect
Line 3667: rina:doctor:collect
Line 3685: rina:doctor:interpret
Line 3697: rina:doctor:verify
Line 3711: rina:doctor:executeFix
Line 3747: rina:doctor:transcript:get
Line 3749: rina:doctor:transcript:export
Line 3910: rina:chat:send
Line 3924: rina:chat:export
Line 3929: agent:plan
Line 3938: rina:agent:plan
Line 3971: rina:executePlanStream
Line 4142: rina:doctor:plan
Line 4162: agent:execute
```

## Benefits of Extraction

1. **Maintainability** - Each domain is isolated and easier to understand
2. **Testability** - Modules can be unit tested independently
3. **Code Review** - Smaller, focused PRs for IPC changes
4. **Onboarding** - New developers can find relevant code faster
5. **Enforcement** - CI can ban new handlers from being added to main.ts

## Next Steps

1. Enable `./scripts/check-no-ipc-in-main.sh` in CI (now unblocked)
2. Keep `scripts/check-duplicate-ipc.js` mandatory in CI
3. Add tests for each IPC registrar module (unit-level registration coverage)
