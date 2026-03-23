# Live Revenue Runbook

This runbook covers the remaining non-local checks required before calling RinaWarp Terminal Pro commercially ready.

Related planning docs:

- [REVENUE_LAUNCH_PLAN.md](/home/karina/Documents/rinawarp-terminal-pro/docs/REVENUE_LAUNCH_PLAN.md)
- [REVENUE_EXECUTION_CHECKLIST.md](/home/karina/Documents/rinawarp-terminal-pro/docs/REVENUE_EXECUTION_CHECKLIST.md)

## What Is Already Automated

Run this first:

```bash
npm run verify:prelaunch:full
```

That verifies the local launch path:

- desktop build
- proof E2E
- Stripe smoke
- Stripe success audit
- revenue E2E
- local Linux packaging

Do not start the live checks until this command is green.

## Current Production Readiness Snapshot

As of 2026-03-19:

- local desktop build is green
- proof E2E is green
- local trust smoke is green
- revenue E2E is green
- GitHub `Release` workflow is green for Linux, Windows, and R2 upload on `v1.1.3`
- GitHub `Release` workflow is still red for macOS because signing secrets are not configured

Current automated prelaunch blocker:

- `npm run verify:prelaunch:full` is failing at `npm run smoke:stripe`
- `https://api.rinawarptech.com/api/health` is currently returning `429`
- Cloudflare is responding with body `error code: 1027`

That means local desktop and proof verification are green, but public billing/API smoke is currently blocked at the edge before the Stripe endpoints can be validated.

The main public-launch blockers are now on the distribution surface:

- `https://www.rinawarptech.com/releases/latest.json` is still serving an older static manifest instead of the current release manifest
- `https://www.rinawarptech.com/download/terminal-pro-linux` is not handing off to the installer artifact yet
- `https://rinawarp-downloads.rinawarptech.workers.dev/download/terminal-pro-linux` currently returns `404`

That means CI release publication is ahead of the public download surface right now.

Update after production routing fixes:

- `https://rinawarptech.com/download/linux/deb` now redirects correctly to the live `1.1.4` Debian package
- `https://rinawarptech.com/download/linux/appimage` now redirects correctly to the live `1.1.4` AppImage
- Debian/Ubuntu desktop systems should use the `.deb` package as the recommended Early Access baseline
- the AppImage remains the in-app updater path for Linux users who already have the standard desktop runtime stack in place

## Live Systems Involved

Desktop app:

- billing client and entitlement refresh:
  - [license.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/license.ts)
  - [registerLicenseIpc.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/main/ipc/registerLicenseIpc.ts)
  - [main.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/main.ts)

Agent backend:

- Stripe webhook and entitlement store:
  - [server.ts](/home/karina/Documents/rinawarp-terminal-pro/packages/rinawarp-agentd/src/server.ts)
  - [entitlementsStore.ts](/home/karina/Documents/rinawarp-terminal-pro/packages/rinawarp-agentd/src/entitlementsStore.ts)

Launch signoff:

- [final-launch-signoff.md](/home/karina/Documents/rinawarp-terminal-pro/docs/final-launch-signoff.md)

## Critical Backend Facts

The paid unlock flow depends on these routes working in production:

- `POST /api/checkout`
- `POST /api/portal`
- `POST /api/license/lookup-by-email`
- `POST /api/license/verify`

The backend entitlement file is written here unless overridden:

- `~/.rinawarp/entitlements.json`

That path comes from [entitlementsStore.ts](/home/karina/Documents/rinawarp-terminal-pro/packages/rinawarp-agentd/src/entitlementsStore.ts).

## Live Manual Test

### 1. Start State

- Use a clean or known-starting desktop account.
- Confirm the app shows starter/free tier.
- Confirm local prelaunch verification is already green.

### 2. Open Upgrade Flow

In the desktop app:

- open `Agent`
- open the `Plan` tab
- click `Upgrade to Pro`

Expected:

- checkout opens in browser
- no local renderer errors
- app still remains usable after browser handoff

### 3. Complete Real Checkout

Use:

- a real low-risk live purchase
or
- a Stripe test/live environment explicitly intended for launch validation

Capture:

- email used
- checkout session id if visible/logged
- resulting Stripe customer id if available

### 4. Confirm Webhook Wrote Entitlement

On the backend host running agentd:

- inspect `~/.rinawarp/entitlements.json`

Expected:

- a customer record exists
- tier is `pro` or intended paid tier
- status is `active`
- `customerId` is populated
- email and/or device mapping exists

### 5. Confirm Desktop Unlock

Back in the app:

- use `I’ve paid — Refresh Pro status`
or
- trigger license refresh from Settings

Expected:

- tier changes from `starter` to paid tier
- upgrade prompts no longer block Pro-only actions
- paid state is visible in the Agent thread / Settings

### 6. Confirm Persistence

- fully quit the desktop app
- relaunch it

Expected:

- paid tier restores from persisted entitlement
- app does not regress to starter on relaunch

### 7. Confirm Billing Portal

From Settings or upgrade flow:

- open billing portal

Expected:

- portal opens for the same customer
- no fallback-only behavior unless intentionally expected

### 8. Confirm Restore Purchase

In a fresh or reset app session:

- use the same billing email with restore purchase / lookup

Expected:

- lookup resolves the correct customer id
- verification restores the paid tier

## Exact Evidence To Capture

Minimum evidence set for signoff:

- screenshot of starter tier before purchase
- screenshot of paid tier after refresh
- copy of relevant entry from `~/.rinawarp/entitlements.json`
- successful checkout/portal URLs opening
- desktop relaunch still showing paid tier

## Known Remaining Non-Local Risks

- macOS signing/notarization still must be verified in the real release environment
- Windows signing still must be verified in the real release environment
- fresh-machine Windows install/activate tests still must be run on the platforms you plan to ship
- live marketplace backend still needs full alignment if marketplace is in launch scope
- Linux AppImage still assumes a desktop runtime stack; the recommended public Linux baseline is Debian/Ubuntu `.deb`

## Launch Decision Rule

Do not mark launch ready until all of these are true:

- `npm run verify:prelaunch:full` is green
- one real checkout completes successfully
- webhook writes entitlement
- desktop refresh unlocks paid tier
- relaunch preserves paid tier
- billing portal works
- the signed release artifacts for the launch platforms are validated
