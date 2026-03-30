# RinaWarp Integration Map

This document maps how `RinaWarp Terminal Pro` connects internally and externally today.

It is meant to answer:

- what the desktop app can call internally
- what services it calls outside the app
- which paths are production-ready
- which paths are still Early Access level

## Integration Layers

### 1. Renderer -> Main

The desktop renderer does not talk directly to Node or the network.

It uses the secure preload bridge in:

- [`preload.ts`](../apps/terminal-pro/src/preload.ts)

This bridge exposes:

- `window.rina`
- `window.electronAPI`

The renderer is intentionally constrained to a whitelist of IPC channels.

### 2. Main -> Local / Hosted Services

The Electron main process owns:

- workspace authority
- execution routing
- update flow
- auth/license/account calls
- support bundle and diagnostics
- agentd integration

Core registration lives in:

- [`main.ts`](../apps/terminal-pro/src/main.ts)

### 3. Website / Worker APIs

Public web flows live on `rinawarptech.com` through the Cloudflare worker:

- [`router.ts`](../website/workers/router.ts)
- [`auth.ts`](../website/workers/api/auth.ts)

Canonical website deploys use Cloudflare Pages/Workers via `npm run deploy:pages`.
Vercel is not part of the required website runtime or release path here; any Vercel support in the repo is optional provider tooling for deployment-capability demos and proofs.

These cover:

- checkout
- portal
- auth
- restore lookup
- feedback
- release/download routes

### 4. agentd Backend

The `agentd` backend provides the execution and team/workspace backend surface:

- [`server.ts`](../packages/rinawarp-agentd/src/server.ts)

This is the main backend for:

- planning
- execution
- workspaces
- invites
- audit
- billing enforcement
- checkout handoff

## Desktop Internal API Surface

### Production-ready renderer bridge

Current important `window.rina` surfaces include:

- workspace
  - `workspaceDefault()`
  - `pickWorkspace()`
- auth
  - `authLogin()`
  - `authRegister()`
  - `authLogout()`
  - `authMe()`
  - `authForgotPassword()`
  - `authResetPassword()`
  - `authState()`
  - `authToken()`
- billing/license
  - `licenseState()`
  - `licenseRefresh()`
  - `licenseCheckout()`
  - `openStripePortal()`
  - `licenseLookupByEmail()`
  - `licenseCachedEmail()`
- updates
  - `updateState()`
  - `checkForUpdate()`
  - `openUpdateDownload()`
  - `installUpdate()`
  - `releaseInfo()`
  - `verifyRelease()`
- execution/proof
  - `runAgent()`
  - `conversationRoute()`
  - `agentPlan()`
  - `executePlanStream()`
  - `executeCapability()`
- runs/diagnostics
  - `openRunsFolder()`
  - `revealRunReceipt()`
  - `supportBundle()`
  - `diagnosticsPaths()`
- team
  - `teamState()`
  - `teamPlan()`
  - `teamWorkspaceCreate()`
  - `teamWorkspaceSet()`
  - `teamWorkspaceGet()`
  - `teamInvitesList()`
  - `teamInviteCreate()`
  - `teamInviteRevoke()`
  - `teamAuditList()`
  - `teamBillingSetEnforcement()`
- marketplace/capabilities
  - `marketplaceList()`
  - `installedAgents()`
  - `installMarketplaceAgent()`
  - `capabilityPacks()`

Primary source:

- [`preload.ts`](../apps/terminal-pro/src/preload.ts)

## External Service Connections

### Desktop app outbound connections

The app currently connects outward to:

- `https://rinawarptech.com`
  - auth/account web flows
  - success/account/team/legal pages
- `https://api.rinawarptech.com`
  - license and telemetry surfaces
- `http://127.0.0.1:5055`
  - local default `agentd`
- `https://agentd.rinawarptech.com`
  - renderer CSP-allowed hosted backend target
- `https://api.openai.com`
  - model calls in agentd / planner layers
- `https://api.anthropic.com`
  - optional model calls in agentd
- `https://api.github.com`
  - GitHub orchestration features in agentd
- `https://api.cloudflare.com`
  - traffic/DNS automation in agentd
- `https://app.posthog.com`
  - analytics

Key files:

- [`renderer.html`](../apps/terminal-pro/src/renderer.html)
- [`main.ts`](../apps/terminal-pro/src/main.ts)
- [`client.ts`](../apps/terminal-pro/src/main/agentd/client.ts)
- [`server.ts`](../packages/rinawarp-agentd/src/server.ts)

## Website / Public API Surface

### Public browser routes

Static/front-door pages:

- `/`
- `/pricing/`
- `/team/`
- `/download/`
- `/docs/`
- `/account/`
- `/login/`
- `/register/`
- `/forgot-password/`
- `/reset-password/`
- `/terms/`
- `/privacy/`
- `/early-access/`
- `/success/`

### Worker-backed API routes

Important live routes:

- `/api/checkout`
- `/api/portal`
- `/api/lookup`
- `/api/auth/register`
- `/api/auth/login`
- `/api/auth/logout`
- `/api/auth/me`
- `/api/auth/forgot-password`
- `/api/auth/reset-password`
- `/api/feedback`
- `/api/license/verify`
- `/api/license/activate`

Primary sources:

- [`router.ts`](../website/workers/router.ts)
- [`auth.ts`](../website/workers/api/auth.ts)

## agentd Backend Surface

Important `agentd` endpoint families already in use:

- execution/planning
  - `/v1/plan`
  - `/v1/execute-plan`
  - `/v1/stream`
  - `/v1/cancel`
- daemon/runtime
  - `/v1/daemon/status`
  - `/v1/daemon/tasks`
  - `/v1/daemon/start`
  - `/v1/daemon/stop`
- team/workspaces
  - `/v1/account/plan`
  - `/v1/workspaces`
  - `/v1/workspaces/:id`
  - `/v1/workspaces/:id/invites`
  - `/v1/workspaces/:id/audit`
  - `/v1/workspaces/:id/billing/enforce`
  - `/v1/invites/:id/revoke`
- orchestration
  - GitHub PR creation
  - branch prep
  - CI status
  - workspace graph

Primary sources:

- [`ipcWrappers.ts`](../apps/terminal-pro/src/main/agentd/ipcWrappers.ts)
- [`server.ts`](../packages/rinawarp-agentd/src/server.ts)

## Status By Area

### Canonical

- renderer -> preload -> main IPC bridge
- main-process workspace authority
- canonical plan / execute / proof path
- website checkout surface
- account auth flows
- restore lookup
- Linux install path
- Linux AppImage updater path

### Transitional

- team managed-offer surface
- workspace picker UX
- account/settings UX polish
- website/account purchase handoff polish
- mixed desktop/web support recovery flows

### Legacy

- older stale launcher/AppImage paths on user machines
- older Stripe product/price history that no longer reflects the live offer
- any old worker-routed static pages that were split out to Pages
- any leftover alternate execution/auth surfaces that bypass the current trusted route

### Early Access but real

- team seat/admin UX
- account/settings UX polish
- multi-surface workspace switching polish
- feedback/support flow polish
- website/account handoff polish

### Still incomplete or not yet fully proven

- Windows in-app updater proof
- full broad-launch platform parity
- macOS distribution/signing/notarization
- complete customer journey polish across every edge case

## Practical Answer

If the question is:

> Did we set up API and other ways to connect to it inside and going out?

The answer is:

- yes, the internal bridges are real
- yes, the outbound service paths are real
- yes, the website and agentd APIs are real
- no, not every single integration is equally polished yet

The main remaining work is not “missing APIs.”

It is:

- tightening UX around those APIs
- proving the remaining updater path on Windows
- continuing release-hardening for broad launch
