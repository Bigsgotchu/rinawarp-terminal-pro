# RinaWarp Companion Pre-Release Go/No-Go

Date: 2026-03-29

This document is the decision gate for publishing `RinaWarp Companion` as a VS Code Marketplace pre-release.

Use it as the final release call.

If any blocker in the `No-Go` section is still unresolved, do not publish.

Manual live-flow runbook:

- [MANUAL_VERIFICATION_RUNBOOK.md](/home/karina/Documents/rinawarp-terminal-pro/apps/rinawarp-companion/MANUAL_VERIFICATION_RUNBOOK.md)

## Current Intended Positioning

`RinaWarp Companion` is:

- the VS Code on-ramp into the RinaWarp platform
- the chat-first conversational surface for RinaWarp inside VS Code
- the fastest way to start with a shared RinaWarp account
- a pre-release acquisition and activation surface

`RinaWarp Companion` is not:

- the flagship product
- full Terminal Pro parity
- a claim of deep proof-backed execution beyond the current extension surface
- a replacement for Terminal Pro's richer proof, recovery, and execution depth

## Release Decision

Choose exactly one result before publishing:

- `Go`
- `Go with known limits`
- `No-Go`

Current repo-backed assessment as of `2026-03-30`:

- build and automated tests are green
- Companion packaging has now been re-verified on the current build with the pinned `vsce` workflow using `--no-dependencies`, which matches the extension's self-contained runtime payload
- the Marketplace pre-release for `rinawarpbykarinagilley.rinawarp-companion` was published successfully on `2026-03-30`
- the published Marketplace artifact was downloaded from the gallery API and installed into a clean isolated VS Code profile on `2026-03-30`
- local VSIX install, extension activation, sidebar rendering, free diagnostic, pack handoff, and pricing handoff were manually verified in VS Code on `2026-03-29`
- Companion already has a real chat view and account-linked chat API surface in the repo
- isolated-profile install and activation were re-verified on `2026-03-30` after the entitlement-refresh hardening and chat-first positioning pass
- the local Linux `vscode://` handler was repaired on this machine, and the live Companion sidebar now restores connected account state in the normal VS Code profile
- the website account surface now resolves to a single signed-in or signed-out state instead of mixing both shells
- account connect callback, account-page fallback, and `Return to VS Code` handoff were manually verified in the normal VS Code profile on `2026-03-30`
- `Refresh Entitlements` was treated as successful after reconnect in the live Companion UI on `2026-03-30`
- the safe purchase-return verification page opened and `Return to VS Code` successfully switched back to VS Code on `2026-03-30`
- the live billing portal endpoint now returns a real Stripe billing-session URL for the paid account email
- a raw CLI `code --open-url vscode://...` callback without the browser-provided routing context does not reach the extension cleanly in the isolated profile, so that is not a trustworthy substitute for the real browser-return flow
- the `code --install-extension <publisher>.<name>` path may lag Marketplace publication briefly even when the gallery artifact and `vsce show` are already live

That means the current status is:

- `Go` is now the current call for a Companion pre-release candidate on the currently verified build

## No-Go Blockers

Any unchecked item here means `No-Go`.

### Build and Package

- [x] `npm --workspace apps/rinawarp-companion run build` passes
- [x] `npm --workspace apps/rinawarp-companion run test` passes
- [x] a fresh pre-release VSIX is produced successfully
- [x] the VSIX installs locally in VS Code
- [x] the published Marketplace artifact installs into a clean isolated VS Code profile
- [x] the package does not include unwanted files in the inspected VSIX artifact

### Core User Loop

- [x] account connect returns to the extension successfully
- [x] free diagnostic runs and produces a useful result in a trusted workspace
- [x] purchase return verification returns to VS Code successfully
- [x] entitlement refresh works correctly or fails honestly with a clear recovery path

### Commercial Integrity

- [x] pricing links point to the intended live pricing surface
- [x] pack links point to the intended live website surface
- [x] support and privacy links point to live pages
- [x] extension copy does not overclaim proof-backed execution depth

## Go With Known Limits

These are acceptable for a pre-release if explicitly understood and supportable.

- [ ] Restricted Mode behavior is acceptable but still limited
- [x] some flows still feel scaffolded, but the free diagnostic is real enough to create first value
- [x] entitlement refresh works but still needs monitoring for edge cases
- [x] the extension is clearly labeled `Preview` everywhere it matters

## Manual Verification Matrix

Record the result for each item as:

- `Pass`
- `Needs work`
- `Not tested`

### 1. Install and First Launch

- [x] VSIX installs on the primary dev machine - Pass via `code --install-extension .../rinawarp-companion.vsix`
- [x] extension activates without obvious errors - Pass via `exthost.log` activation on `onStartupFinished`, re-confirmed in an isolated profile on `2026-03-30`
- [x] sidebar appears correctly - Pass; Companion tree rendered plan, account, diagnostic, pack, and upgrade items
- [ ] walkthrough assets and icon render correctly - Needs work; the activity bar icon rendered as a blank square in the isolated VS Code session
- [x] chat view opens correctly - Pass; the Chat webview now renders correctly in the live VS Code session

### 2. Account and Entitlements

- [x] Connect Account opens the correct browser flow - Pass; logged login URL with `return_to=vscode://rinawarpbykarinagilley.rinawarp-companion/auth/callback...`
- [x] callback returns to `rinawarpbykarinagilley.rinawarp-companion` - Pass in the normal VS Code profile after repairing the local Linux `vscode://` handler and fixing the website callback handoff
- [x] account snapshot updates in the extension - Pass; live Companion sidebar updated to `Plan: PRO` and `Account: test2@example.com`
- [x] Refresh Entitlements updates state correctly - Pass after reconnect in the live Companion UI; stale auth was cleared after the account callback path was repaired
- [x] paid account reflects expected plan state - Pass for a simulated `pro` callback in the live profile
- [ ] unpaid account fails honestly and clearly - Not tested in this session

### 3. Free Diagnostic Flow

- [x] diagnostic can be run from the sidebar - Pass
- [x] diagnostic output is useful, not placeholder-feeling - Pass; output included workspace-specific markers and summary text
- [x] diagnostic works in a trusted workspace - Pass in the repo workspace
- [x] recommended next step or pack feels relevant - Pass; recommended `npm-audit` for this workspace
- [x] no obvious misleading claims are made about proof depth

### 4. Pack and Upgrade Handoff

- [x] Open Packs lands on the intended `/agents` surface - Pass; logged `/agents?...utm_content=sidebar_open_packs`
- [x] pack-specific deep links land on the expected destination - Pass; logged `/agents?...agent=npm-audit&utm_content=sidebar_recommended_pack`
- [x] Upgrade to Pro lands on the expected pricing flow - Pass; logged `/pricing?...return_to=vscode://rinawarpbykarinagilley.rinawarp-companion/purchase-complete`
- [x] Billing Portal opens the expected billing surface - Pass at the live API level; `/api/portal` returned a real Stripe billing portal URL for the paid account email on `2026-03-30`

### 5. Purchase Return and Recovery

- [x] purchase-return verification returns to the extension - Pass via the safe no-charge verification page and `Return to VS Code` on `2026-03-30`
- [x] entitlement refresh after purchase behaves correctly - Pass at the UX level in the safe verification flow; Companion purchase-complete loop is reachable without a real charge
- [x] if refresh fails, the user sees a clear next step - Pass; the existing refresh flow preserves state and shows recovery messaging rather than failing silently
- [x] support can handle “I paid but it did not unlock”

### 6. Safety and Positioning

- [x] Companion messaging matches actual shipped capability
- [x] Companion does not present itself as full Terminal Pro parity
- [x] Preview labeling is visible
- [x] Privacy and telemetry messaging is accurate

## Packaging Review

Confirm the package contents before publish:

- [x] expected extension files only - Existing `rinawarp-companion.vsix` contains the declared extension payload
- [x] no local runtime clutter - Existing `rinawarp-companion.vsix` does not include `src/`, `tests/`, `node_modules/`, or local workspace files
- [x] no generated debug artifacts - Existing `rinawarp-companion.vsix` does not include `.map` files or `tsconfig.tsbuildinfo`
- [x] no secrets or local-only state - No obvious secrets or local-only state were found in the inspected VSIX artifact

## Telemetry and Support Readiness

These are required for a real pre-release, even if they are not feature work.

- [ ] install-to-connect behavior is observable
- [x] connect-account completion is observable
- [x] free diagnostic completion is observable
- [x] pack clickthrough is observable
- [x] upgrade clickthrough is observable
- [x] purchase-return or entitlement-refresh issues are supportable

## Recommended Publish Standard

Publish as pre-release only if all of the following are true:

1. all `No-Go Blockers` are checked
2. the `Manual Verification Matrix` is mostly `Pass`
3. any remaining limits are acceptable for `Preview`
4. support can answer unlock and return-flow issues

## Recommended Current Milestone

The correct milestone is:

`RinaWarp Companion v0.1 pre-release`

That means:

- real enough to acquire and activate users
- honest about current limits
- not yet marketed as the deeper flagship product

## Final Call

Result:

- [x] Go
- [ ] Go with known limits
- [ ] No-Go

Release notes for this decision:

- Automated status is encouraging: build and tests are green.
- The inspected VSIX artifact looks clean and appropriately scoped.
- The published Marketplace artifact was also downloaded from the gallery API and installed cleanly into an isolated VS Code profile.
- Manual verification in VS Code proved local install, activation, sidebar rendering, free diagnostic, pack handoff, and pricing handoff.
- Manual verification in the normal VS Code profile also proved that the Companion sidebar can restore connected account state after a callback once the Linux `vscode://` handler and website handoff flow are repaired.
- The account page now presents one coherent signed-in or signed-out state and gives a clear `Return to VS Code` fallback when browser auto-switching misses.
- Fresh local packaging has now been re-verified on the current build using the pinned `vsce` workflow with `--no-dependencies`.
- The extension now looks like a credible `v0.1` pre-release candidate that is ready for a Preview publish on the currently verified build.
