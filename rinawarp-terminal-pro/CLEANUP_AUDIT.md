# Cleanup Audit

Branch note:
- Requested branch: `cleanup/remove-stale-code`
- Initial issue: branch creation was blocked by sandboxed writes to the parent `.git` directory
- Current result: working on `cleanup/remove-stale-code`

## Candidate
File: `apps/terminal-pro/src/chat-router.ts`
Symbol/string: `chat-first`, `System Doctor`, `awaiting-fix`
Why it may be stale:
- The product has shifted toward repo-fix agent work, but this file still presents an older chat-first System Doctor flow.
Evidence:
- Imported live from `apps/terminal-pro/src/main.ts` and called at `main.ts:4206`
- Depends on `./doctor-bridge.js`
- Header still says `Replaces button-driven workflows with chat-first interaction`
Action:
- Keep for now
- Audit whether `runInlineRina(...)` has replaced the same user journeys before removing
Result:
- Not safe to delete yet; live code path
Tests run:
- None in this audit batch

## Candidate
File: `web/assets/lifetime-promo.js`, `web/assets/lifetime.json`
Symbol/string: `lifetime-promo.js`, `lifetime-card`, `price_1SdxlmGZrRdZy3W9ncwPfgFr`, `price_1Sdxm2GZrRdZy3W9C5tQcWiW`, `price_1SdxmFGZrRdZy3W9skXi3jvE`
Why it may be stale:
- These assets still describe older lifetime plan presentation, but no current page appears to mount or load them.
Evidence:
- `rg -n "lifetime-promo\\.js|lifetime\\.json" web website rinawarptech-website docs scripts deploy apps packages stripe-webhook-worker`
- Only hit is `web/assets/lifetime-promo.js:33`, where the script fetches its own JSON.
- `rg -n "lifetime-card|startCheckout\\(|lifetime-promo\\.js" web website rinawarptech-website`
- `web/pricing.html` uses `startCheckout(...)`, but there is no `lifetime-card` mount and no `<script>` reference to `lifetime-promo.js`.
- Stripe price IDs still exist in `stripe-webhook-worker`, which means lifetime checkout support still exists at the backend layer even though this frontend promo asset pair is orphaned.
Action:
- Remove both orphaned frontend assets.
Result:
- Removed. No inbound references from site pages/templates were found.
Tests run:
- `pnpm --filter rinawarp-terminal-pro build:electron` ✅
- `npm run test:rina-runtime` ✅
- `pnpm -C apps/terminal-pro exec playwright test tests/e2e/rina-acceptance.electron.spec.ts -c tests/playwright.config.ts` ⚠️ blocked by Electron host launch failure before app bootstrap (`sandbox_host_linux.cc(41)`, `shutdown: Operation not permitted`)

## Candidate
File: `apps/terminal-pro/src/renderer.html`
Symbol/string: `Letting Rina interpret that request...`, `Switch to Agent mode`, `Code Mode`, `Doctor v1`
Why it may be stale:
- Renderer copy still exposes old Agent/Code/Doctor concepts that conflict with current repo-fix positioning.
Evidence:
- `renderer.html:3031` uses `Letting Rina interpret that request...`
- `renderer.html:3867` and `renderer.html:4384` mention `Switch to Agent mode`
- `renderer.html:7046` comment says `Code Mode: plan + run`
- `renderer.html:7150+` still contains `Doctor v1` flow
- `renderer.html:7170+` calls `window.rina.doctorPlan(...)`
Action:
- Keep behavior for now
- Split into two follow-ups:
- copy cleanup for stale labels
- code-path audit for `doctorPlan`/doctor UI branch
Result:
- Mixed state: some stale copy, some still-live functionality
Tests run:
- None in this audit batch

## Candidate
File: `web/download.html`
Symbol/string: `Agent Mode`, `Terminal Mode`, `System Doctor`
Why it may be stale:
- Marketing page still describes older mode-based UI and a coming-soon System Doctor concept instead of current repo-fix agent framing.
Evidence:
- `web/download.html:263` lists `Agent Mode`
- `web/download.html:264` lists `Terminal Mode`
- `web/download.html:346` shows `System Doctor`
Action:
- Safe candidate for copy cleanup after product copy pass
- No evidence yet that the page is unused, so do not delete file
Result:
- Keep file, update copy later
Tests run:
- None in this audit batch

## Candidate
File: `docs/RINA_LICENSE_GATING_V1.md`
Symbol/string: `starter`, `creator`, `pioneer`, `founder`, `enterprise`
Why it may be stale:
- Public pricing is now `free / pro_monthly / team_seat_monthly`, but this doc still presents the older internal tier model as primary.
Evidence:
- Internal tier names appear throughout the doc, beginning at line 12
- Runtime plan mapping in `apps/terminal-pro/src/plans.ts` now maps old license tiers into current billing plans
Action:
- Keep for now
- Rewrite as internal enforcement documentation or add an explicit mapping section after code cleanup
Result:
- Conflicting documentation, but still relevant to live enforcement internals
Tests run:
- None in this audit batch

## Candidate
File: `docs/TEAM_BACKEND_SURFACE_V1.md`
Symbol/string: team billing/runtime contract
Why it may be stale:
- Team pricing and entitlement behavior are changing quickly, so this surface may no longer describe current runtime truth.
Evidence:
- Previously identified as conflicting with current seat enforcement reality
- Not yet matched against current IPC/runtime code in this audit pass
Action:
- Keep for now
- Re-audit after code-level cleanup of team/plan handling
Result:
- Needs confirmation, not safe to delete
Tests run:
- None in this audit batch

## Candidate
File: `packages/rinawarp-agentd/src/license.ts`
Symbol/string: `starter`, `creator`, `pioneer`, `founder`, `enterprise`
Why it may be stale:
- Internal license naming may be valid, but it now conflicts with externally-visible plan names.
Evidence:
- `VALID_LICENSE_TIERS` still includes the full old tier list
- Related tests still assert this behavior in `packages/rinawarp-agentd/test/license-resolution.test.mjs`
Action:
- Keep for now
- Treat as internal compatibility layer until runtime naming is unified deliberately
Result:
- Live code with test coverage; not removable
Tests run:
- None in this audit batch

## Candidate
File: `web/assets/lifetime-promo.js`
Symbol/string: `founder`, `pioneer`
Why it may be stale:
- Old lifetime-tier promo logic may conflict with the current simplified pricing model.
Evidence:
- References `founder` and `pioneer`
- Fetches `web/assets/lifetime.json`
- No reference found from any page/template in repo search; only self-reference plus `web/assets/lifetime.json`
- Broader lifetime concepts still exist in runtime/docs:
- `apps/terminal-pro/src/main.ts` has `LIFETIME_TIERS`
- `stripe-webhook-worker/src/index.ts` still maps a `pioneer` lifetime price
- `deploy/launch-readiness.md` still lists founder/pioneer lifetime SKUs
Action:
- Treat `web/assets/lifetime-promo.js` and `web/assets/lifetime.json` as a likely isolated removal batch
- Do not remove lifetime tier handling elsewhere until billing/runtime intent is explicitly retired
Result:
- Strong stale asset candidate; lifetime product concept still exists elsewhere
Tests run:
- None in this audit batch

## Candidate
File: apps/terminal-pro/src/renderer.html
Symbol/string: `Switch to Agent mode`, `Letting Rina interpret that request...`, `Code Mode: plan + run`, `Doctor v1`
Why it may be stale:
- Renderer copy still exposes older mode/doctor labels that overlap with current terminal/agent/code flows.
Evidence:
- UI still uses active `mode === "agent"`, `mode === "code"`, and `mode === "terminal"` behavior in live render logic.
- `runDoctor()` and `Doctor v1` evidence collection are still defined and wired to doctor flows.
- Agent daemon diagnostics are still present and live in the UI.
Action:
- Keep for now.
- Audit this file for cosmetic copy cleanup separately from behavior cleanup.
Result:
- Some stale labels remain, but the underlying agent/doctor/code mode implementation is active.
Tests run:
- None in this audit batch

## Candidate
File: network-based dead-code audit
Symbol/string: `ts-prune`, `depcheck`
Why it may be stale:
- We still need symbol- and dependency-level evidence for safe removal.
Evidence:
- `pnpm dlx ts-prune -p apps/terminal-pro/tsconfig.json` completed and produced no unused export warnings for the app.
- `pnpm dlx depcheck` reported `electron` as unused and `playwright` as missing in `./scripts/collect-ci-support-artifacts.mjs`.
Action:
- Do not remove `electron` without manual verification of Electron build/test usage.
- Investigate whether `playwright` is intentionally installed indirectly or should be declared explicitly.
Result:
- ts-prune found no obvious unused exports in the Electron app.
- depcheck flagged one likely false positive on `electron` and one missing runtime dependency reference.
Tests run:
- None in this audit batch

## Removed
- `web/assets/lifetime-promo.js`
- `web/assets/lifetime.json`
- `apps/terminal-pro/src/doctor-bridge.ts` legacy command helpers: `legacyDoctorCommandToPlanStep`, `isLegacyCommand`, and their mapping shim
- `apps/terminal-pro/src/agent-profile.ts` stale exports: `gateFileRead`, `gateFileWrite`, `approvalScopeForCommand`

## Validation
- `pnpm --prefix apps/terminal-pro dlx ts-prune -p tsconfig.json` ✅
- `pnpm --filter rinawarp-terminal-pro build:electron` ✅
- `pnpm --prefix apps/terminal-pro run test:rina-runtime` ✅
- `pnpm --prefix apps/terminal-pro exec playwright test tests/e2e/rina-acceptance.electron.spec.ts -c tests/playwright.config.ts` ✅

## Kept intentionally
- `apps/terminal-pro/src/chat-router.ts`
  - Still imported and executed by `apps/terminal-pro/src/main.ts`
- `packages/rinawarp-agentd/src/license.ts`
  - Still part of live license resolution and covered by tests
- `docs/RINA_LICENSE_GATING_V1.md`
  - Conflicting, but still documents current internal enforcement concepts
- `apps/terminal-pro/src/main/ipc/registerDoctorIpc.ts`
  - Still registered by `registerAllIpc.ts` and invoked from renderer/preload doctor flows
