# RinaWarp Companion Pre-Release Go/No-Go

Date: 2026-03-29

This document is the decision gate for publishing `RinaWarp Companion` as a VS Code Marketplace pre-release.

Use it as the final release call.

If any blocker in the `No-Go` section is still unresolved, do not publish.

## Current Intended Positioning

`RinaWarp Companion` is:

- the VS Code on-ramp into the RinaWarp platform
- the fastest way to start with a shared RinaWarp account
- a pre-release acquisition and activation surface

`RinaWarp Companion` is not:

- the flagship product
- full Terminal Pro parity
- a claim of deep proof-backed execution beyond the current extension surface

## Release Decision

Choose exactly one result before publishing:

- `Go`
- `Go with known limits`
- `No-Go`

Current repo-backed assessment as of `2026-03-29`:

- build and automated tests are green
- Companion packaging evidence exists, but a fresh package run was not cleanly verified in this shell
- the account, purchase-return, entitlement-refresh, and local VSIX install flows still require manual verification

That means the current status is:

- `No-Go` for immediate publish without manual checks
- likely movable to `Go with known limits` after the manual verification items pass

## No-Go Blockers

Any unchecked item here means `No-Go`.

### Build and Package

- [x] `npm --workspace apps/rinawarp-companion run build` passes
- [x] `npm --workspace apps/rinawarp-companion run test` passes
- [ ] a fresh pre-release VSIX is produced successfully
- [ ] the VSIX installs locally in VS Code
- [ ] the package does not include unwanted files

### Core User Loop

- [ ] account connect returns to the extension successfully
- [ ] free diagnostic runs and produces a useful result in a trusted workspace
- [ ] purchase success returns to VS Code successfully
- [ ] entitlement refresh works correctly or fails honestly with a clear recovery path

### Commercial Integrity

- [x] pricing links point to the intended live pricing surface
- [x] pack links point to the intended live website surface
- [x] support and privacy links point to live pages
- [x] extension copy does not overclaim proof-backed execution depth

## Go With Known Limits

These are acceptable for a pre-release if explicitly understood and supportable.

- [ ] Restricted Mode behavior is acceptable but still limited
- [x] some flows still feel scaffolded, but the free diagnostic is real enough to create first value
- [ ] entitlement refresh works but still needs monitoring for edge cases
- [x] the extension is clearly labeled `Preview` everywhere it matters

## Manual Verification Matrix

Record the result for each item as:

- `Pass`
- `Needs work`
- `Not tested`

### 1. Install and First Launch

- [ ] VSIX installs on the primary dev machine - Not tested in this session
- [ ] extension activates without obvious errors - Not tested in this session
- [ ] sidebar appears correctly - Not tested in this session
- [ ] walkthrough assets and icon render correctly - Not tested in this session
- [ ] chat view opens correctly - Not tested in this session

### 2. Account and Entitlements

- [ ] Connect Account opens the correct browser flow - Manual check required
- [ ] callback returns to `rinawarp.rinawarp-companion` - Manual check required
- [ ] account snapshot updates in the extension - Manual check required
- [ ] Refresh Entitlements updates state correctly - Manual check required
- [ ] paid account reflects expected plan state - Manual check required
- [ ] unpaid account fails honestly and clearly - Manual check required

### 3. Free Diagnostic Flow

- [ ] diagnostic can be run from the sidebar - Manual check required
- [ ] diagnostic output is useful, not placeholder-feeling - Manual check required
- [ ] diagnostic works in a trusted workspace - Manual check required
- [ ] recommended next step or pack feels relevant - Manual check required
- [x] no obvious misleading claims are made about proof depth

### 4. Pack and Upgrade Handoff

- [ ] Open Packs lands on the intended `/agents` surface - Manual check required
- [ ] pack-specific deep links land on the expected destination - Manual check required
- [ ] Upgrade to Pro lands on the expected pricing flow - Manual check required
- [ ] Billing Portal opens the expected billing surface - Manual check required

### 5. Purchase Return and Recovery

- [ ] purchase success returns to the extension - Manual check required
- [ ] entitlement refresh after purchase behaves correctly - Manual check required
- [ ] if refresh fails, the user sees a clear next step - Manual check required
- [x] support can handle “I paid but it did not unlock”

### 6. Safety and Positioning

- [x] Companion messaging matches actual shipped capability
- [x] Companion does not present itself as full Terminal Pro parity
- [x] Preview labeling is visible
- [x] Privacy and telemetry messaging is accurate

## Packaging Review

Confirm the package contents before publish:

- [ ] expected extension files only - Needs manual package inspection
- [ ] no local runtime clutter - Needs manual package inspection
- [ ] no generated debug artifacts - Needs manual package inspection
- [ ] no secrets or local-only state - Needs manual package inspection

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

- [ ] Go
- [ ] Go with known limits
- [x] No-Go

Release notes for this decision:

- Automated status is encouraging: build and tests are green.
- Immediate publish is still blocked on manual verification of the core VS Code and browser-return flows.
- The extension looks like a credible `v0.1` pre-release candidate once those manual checks pass.
