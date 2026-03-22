# Final Launch Signoff

Date: __________
Verifier run: `npm run verify:prelaunch:full`
Result: `blocked`
Owner: __________

Live revenue runbook:

- [LIVE_REVENUE_RUNBOOK.md](/home/karina/Documents/rinawarp-terminal-pro/docs/LIVE_REVENUE_RUNBOOK.md)

Primary completion checklist:

- [RINA_COMPLETION_CHECKLIST.md](/home/karina/Documents/rinawarp-terminal-pro/docs/RINA_COMPLETION_CHECKLIST.md)

## Current Known Blockers

- [x] Local desktop verification is green.
  - `build:electron`, `test:trust-smoke`, and `test:e2e:proof` are passing.
  - local paid-gating proof is covered: starter blocks Pro-only capability runs, seeded Pro entitlement unlocks them.
  - marketplace local gating proof is covered: starter sees premium agents as locked, seeded Pro entitlement enables local install.
- [ ] Public Stripe/API smoke is green.
  - `npm run verify:prelaunch:full` currently stops at `npm run smoke:stripe`.
  - `https://api.rinawarptech.com/api/health` is returning `429` with Cloudflare body `error code: 1027`.
- [x] Downloads surface is confirmed live and serving manifest-backed routes.
  - `https://rinawarptech.com/download/linux/deb` redirects correctly to the `1.1.4` Debian package.
  - `https://rinawarptech.com/download/linux/appimage` redirects correctly to the `1.1.4` AppImage.
- [ ] Public download surface is re-verified against the current live site and reconciled with the runbook.
  - This document and `LIVE_REVENUE_RUNBOOK.md` must agree on whether the apex Pages/download surface is current before launch.
- [ ] macOS signing secrets are configured in GitHub Actions if macOS is part of launch scope.
  - Current `Release` workflow runs fail the macOS job without `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID`.
- [x] Capability-pack execution is wired through the blessed run/receipt path, not just discovery/gating.
  - local proof covers ready, locked, install-needed, and seeded-Pro-unlocked capability states in-thread.
- [ ] Agent-first UI audit is completed and signed off.

## Hard Launch Gates

- [ ] Stripe test checkout completed successfully with a real test card.
- [ ] Stripe webhook upgraded the license in the desktop app after checkout.
- [x] Free users are blocked from Pro-only capability actions in local desktop verification.
  - live billing/API confirmation is still pending because public Stripe smoke is blocked upstream.
- [x] Pro badges are visibly present in the marketplace UI.
- [x] Marketplace install flow is locally verified for both starter-blocked and Pro-unlocked states.
- [ ] Marketplace install flow is verified against the live billing/backend path.
- [x] Local upgrade-boundary copy matches the actual Pro unlocks shown in the desktop app.
- [ ] Analytics shows the expected conversion and usage events after a real flow.

Do not launch publicly until every hard gate above is checked.

## UX Signoff

- [ ] Electron app opens cleanly from the built app without crashing.
- [ ] Terminal input is responsive and command output streams live.
- [ ] Workspace detection correctly identifies an opened project.
- [ ] A failing command surfaces the AI/pro upgrade experience clearly.
- [ ] Upgrade modal shows the correct price and value framing.
- [x] Marketplace install flow feels clear for both free and blocked Pro agents in local desktop verification.
- [x] Marketplace upgrade copy explains the real Pro unlocks in local desktop verification.
- [ ] Agent remains the obvious home screen; inspectors do not read like peer-primary work modes.
- [ ] Capability-required / capability-locked / capability-install-needed states feel clear in-thread.

## Revenue Flow

- [ ] `upgrade_clicked` recorded.
- [ ] `checkout_started` recorded.
- [ ] `checkout_completed` recorded.
- [ ] License verification or unlock event recorded.
- [ ] Subscription cancellation or downgrade behavior is understood and acceptable.

Notes:

____________________________________________________________

____________________________________________________________

## Installer Confidence

- [x] Linux installer tested from a fresh install path.
- [x] Debian/Ubuntu `.deb` path is the recommended Early Access Linux baseline.
- [ ] macOS installer tested, if shipping macOS at launch.
- [x] Windows installer tested, if shipping Windows at launch.
- [x] Installed Linux package registers and launches under a display-capable environment after install.
- [ ] Checksums or release artifacts match what you intend to publish.

## Demo And Marketing

- [ ] Demo video reflects the current product behavior.
- [ ] Demo includes marketplace and upgrade flow if those are central to launch messaging.
- [ ] Pricing and product claims match the app and checkout flow.
- [ ] Launch post / landing page copy matches the actual shipped experience.

## Final Decision

- [ ] Approved for public launch
- [ ] Approved for limited/beta launch only
- [ ] Not approved yet

Decision notes:

____________________________________________________________

____________________________________________________________
