# System Wiring Audit

Date: 2026-03-23
Scope: `apps/terminal-pro`
Status legend:

- `complete`: visible surface or path is present end to end in the current repo
- `partial`: mostly wired, but one important link or trust condition is still weak
- `duplicate`: multiple owners or overlapping state still exist
- `legacy`: path still exists but is no longer the preferred source of truth
- `orphaned`: implemented in one layer but not clearly connected through the rest

This audit is meant to answer one question: is each feature actually wired all the way through

`visible surface -> action -> state -> bridge -> handler -> result -> proof -> render`

## Public Surfaces

| Surface | UI | Action bound | State/store | IPC/backend | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Agent | yes | yes | yes | yes | complete | Main thread and composer are present in [renderer.html](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/renderer.html) and routed through [actionController.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/renderer/actions/actionController.ts). |
| Runs | yes | yes | yes | yes | complete | `data-tab="runs"` and run actions flow through [bindRunActions.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/renderer/actions/bindRunActions.ts) to [runsIpc.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/main/runs/runsIpc.ts). |
| Capabilities | yes | yes | yes | yes | complete | UI tab exists, packs load via `rina:capabilities:list`, run via `rina:capabilities:execute`. |
| Diagnostics | yes | yes | yes | yes | complete | Drawer exists, diagnostics and support bundle are bridged in preload and handled in main. |
| Settings | yes | yes | yes | renderer-local | partial | Visible surface is real, but Settings still relies on DOM runtime ownership through `window.__rinaSettings` rather than canonical store state. |
| Workspace picker | yes | yes | yes | yes | complete | Top-bar button uses `rina:workspace:pick` and dispatches workspace selection back into the app. |
| Composer | yes | yes | yes | yes | partial | Core path is wired, but duplicate-submit protection was still an active stabilization area in this release cycle. |
| Recovery card | yes | yes | yes | yes | complete | Recovery copy and actions are rendered from run state and use the same run-action handlers as the thread. |
| Receipt viewer | yes | yes | yes | yes | complete | Drawer, reveal action, receipt state, and structured receipt IPC are all present. |
| Updater | yes | yes | yes | yes | partial | Update UI and IPC exist, but feed URLs still point to R2 in [updateService.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/main/update/updateService.ts) rather than the primary-domain release path. |

## Intent To Execution Map

| Intent | Routed | Plan | Runner | Receipt | UI block | Recovery | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `what can you do` / help | yes | n/a | no run | n/a | reply | n/a | complete | Explicit help route now lives in [conversationRouter.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/main/orchestration/conversationRouter.ts). |
| self-check | yes | yes | yes | yes | yes | yes | partial | Routed and executed, but packaged self-check behavior still needs customer-seat validation after submit/state stabilization. |
| build | yes | yes | yes | yes | yes | yes | complete | Routed through `execute`, planned, run-backed, and receipt-backed. |
| test | yes | yes | yes | yes | yes | yes | complete | Same path as build with run and receipt follow-up. |
| deploy | yes | yes | yes | yes | yes | yes | partial | Capability packs and proof model exist, but real provider execution remains target-specific and should still be treated as proof-gated. |

## IPC Contract Audit

Categories below are judged against five links:

1. declared in preload allowlist
2. exposed in preload API
3. invoked in renderer
4. handled in main
5. usable response path in UI

| Category | Contract state | Notes |
| --- | --- | --- |
| settings | partial | No dedicated main IPC. Settings is primarily renderer-local and opened through `window.__rinaSettings`, so it does not benefit from the same contract discipline as other surfaces. |
| workspace | complete | `rina:workspace:pick` and `rina:workspace:default` are allowlisted, exposed, used, and handled in [main.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/main.ts). |
| updater | complete | Update IPC is declared in preload and backed by [updateService.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/main/update/updateService.ts). |
| runs | complete | `rina:runs:list`, `rina:runs:tail`, `rina:runs:artifacts`, and `rina:revealRunReceipt` are fully bridged. |
| receipts | complete | Receipt reveal path is present end to end and linked back into the Runs and thread UI. |
| diagnostics | complete | `rina:diagnostics:paths` and `rina:support:bundle` are fully wired. |
| billing/auth | complete | Auth, license, portal, and lookup channels are present in preload and handled in main. |
| capabilities | complete | `rina:capabilities:list` and `rina:capabilities:execute` are fully wired. |
| telemetry | partial | Event tracking is bridged, but much of it is support/debug quality rather than hard product enforcement. |

## Navigation Wiring Audit

| Area | Status | Notes |
| --- | --- | --- |
| sidebar/topbar tabs | complete | Tabs are delegated through [bindNavigationActions.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/renderer/actions/bindNavigationActions.ts). |
| Settings open/close | partial | A real duplicate binding existed in [settings/bootstrap.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/renderer/settings/bootstrap.ts) and was recently reduced, but this area still deserves explicit regression coverage because ownership is split between nav actions and `__rinaSettings`. |
| workspace picker | complete | One visible owner with a clear bridge to workspace selection. |
| composer submit | partial | One controller owns submit, but this remains a stabilization hotspot because duplicate submission was recently observed in packaged builds. |
| receipt open | complete | Run action reveals receipt and opens the receipt drawer in canonical UI state. |

## Canonical State Audit

Canonical store fields:

- `workspaceKey`
- `activeTab`
- `activeCenterView`
- `activeRightView`
- `ui.openDrawer`
- `runs`
- `receipt`
- `deployment`
- `runtime.mode`

Known ownership issues:

| State concern | Status | Notes |
| --- | --- | --- |
| workspace root | complete | Store-backed and reflected in UI selectors. |
| drawer/view state | partial | The store model is better than before, but Settings is still represented outside the store via `window.__rinaSettings.isOpen()`. |
| right panel | partial | `activeRightView` is canonical for Agent/Diagnostics, but bug receipts needed extra logic to null out `rightPanel` when Settings was open. |
| status/footer truth | complete | Footer now derives from selectors rather than raw ad hoc labels. |
| receipt state | complete | `receipt/set` plus `ui/openDrawer` gives one clear receipt path. |
| deploy state | complete | Deployment state is derived and stored canonically in [deploymentState.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/renderer/workbench/deploymentState.ts). |

Bottom line:

- good: most workbench surfaces read from the store
- weak: Settings open/closed state is still not fully canonical

## Run And Receipt Proof Audit

| Check | Status | Notes |
| --- | --- | --- |
| run IDs created | complete | Runs are listed from structured session storage. |
| status transitions | partial | Real transitions exist, but stale restored session wrappers recently had to be deprioritized because they polluted `Last run`. |
| timestamps captured | complete | Runs and structured receipts carry `startedAt`, `updatedAt`, `endedAt`, and command timestamps. |
| exit codes captured | complete | Structured command receipts capture `exitCode` and `ok`. |
| receipt persisted | complete | Runs reveal structured receipts through [runsIpc.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/main/runs/runsIpc.ts). |
| UI linked to proof | complete | Thread, Runs, and receipt viewer all link back to run/receipt state. |
| no success without proof | partial | The product intent is clear, but customer-seat trust still depends on keeping stale or placeholder run state from presenting as live truth. |

## Build Artifact Audit

| Asset | Status | Notes |
| --- | --- | --- |
| preload script | complete | Built into `dist-electron/preload.cjs`. |
| renderer HTML | complete | Present in packaged build and used at runtime. |
| CSS/static styles | complete | Renderer links multiple CSS files directly from packaged assets. |
| icons/assets | complete | Electron builder resolves icon path from `src/assets/icon.png`. |
| settings assets | complete | Settings is renderer-local and packaged with the renderer bundle. |
| receipt UI assets | complete | Receipt panel styles and renderers are in packaged renderer assets. |
| update config | complete | Update config IPC and service exist. |
| update endpoint parity | partial | App updater still references the R2 feed URL in code even though site-facing release URLs were canonicalized earlier. |

## Dead Surface / Orphan Audit

| Item | Status | Notes |
| --- | --- | --- |
| Settings open state | duplicate | Visible nav, bootstrap runtime, and debug snapshot all reason about Settings with overlapping ownership. |
| diagnostics/support bundle | complete | No longer orphaned; now part of the real product flow. |
| capability packs | complete | Packs exist in catalog, renderer, preload, and main execution flow. |
| deploy proof scripts | partial | Good proof infrastructure exists, but not every path is yet part of the default customer release gate. |
| legacy placeholder run state | legacy | Stale restored session wrappers had been acting like live truth and needed explicit deprioritization. |

## Feature Flag / Split Path Audit

Current split-path risk areas:

- `window.__rinaSettings` runtime ownership versus store-owned workbench views
- updater feed URLs in app code versus primary-domain release trust path on the website
- packaged behavior versus dev behavior for composer and settings interactions

No large explicit feature-flag maze was identified in this pass, but there are still behavioral split paths that act like flags in practice.

## Packaging Parity Audit

| Target | Status | Notes |
| --- | --- | --- |
| Linux AppImage | partial | Strongest current coverage. First-run packaged journey exists and is passing, but recent stabilization bugs all reproduced here first. |
| Linux `.deb` | partial | Artifact is built, but packaged parity coverage is weaker than AppImage coverage. |
| Windows installer | partial | Customer-facing binary exists, but this repo’s strongest automated parity checks are still Linux-first. |

## Release Gate Recommendation

Required release gate for desktop trust:

1. typecheck/build
2. surface audit spot check against this document
3. IPC contract check
4. intent contract check
5. state consistency check
6. packaged first-run smoke
7. run/receipt proof check

Existing strong gates:

- `npm --workspace apps/terminal-pro run build`
- `node --test --test-reporter=spec tests/agent.test.mjs`
- `npm run qa:stabilization-core`

Recommended next automation:

- add a dedicated IPC contract manifest check
- add an intent contract check for `help`, `self-check`, `build`, `test`, and `deploy`
- add a canonical state invariant test around Settings versus Agent/Diagnostics ownership

## Highest-Priority Remaining Gaps

1. Make Settings open/close state fully canonical in the store instead of mixing store state with `window.__rinaSettings`.
2. Keep composer submit ownership singular and regression-tested in packaged builds.
3. Keep `help/capabilities` ahead of self-check and verification in the router.
4. Align updater feed URLs in app code with the primary-domain trust path if first-party updater trust is a product requirement.
5. Strengthen non-AppImage packaging parity if `.deb` and Windows are first-class release targets.
