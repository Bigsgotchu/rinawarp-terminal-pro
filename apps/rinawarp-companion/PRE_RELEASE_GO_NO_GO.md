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

## No-Go Blockers

Any unchecked item here means `No-Go`.

### Build and Package

- [ ] `npm --workspace apps/rinawarp-companion run build` passes
- [ ] `npm --workspace apps/rinawarp-companion run test` passes
- [ ] a fresh pre-release VSIX is produced successfully
- [ ] the VSIX installs locally in VS Code
- [ ] the package does not include unwanted files

### Core User Loop

- [ ] account connect returns to the extension successfully
- [ ] free diagnostic runs and produces a useful result in a trusted workspace
- [ ] purchase success returns to VS Code successfully
- [ ] entitlement refresh works correctly or fails honestly with a clear recovery path

### Commercial Integrity

- [ ] pricing links point to the intended live pricing surface
- [ ] pack links point to the intended live website surface
- [ ] support and privacy links point to live pages
- [ ] extension copy does not overclaim proof-backed execution depth

## Go With Known Limits

These are acceptable for a pre-release if explicitly understood and supportable.

- [ ] Restricted Mode behavior is acceptable but still limited
- [ ] some flows still feel scaffolded, but the free diagnostic is real enough to create first value
- [ ] entitlement refresh works but still needs monitoring for edge cases
- [ ] the extension is clearly labeled `Preview` everywhere it matters

## Manual Verification Matrix

Record the result for each item as:

- `Pass`
- `Needs work`
- `Not tested`

### 1. Install and First Launch

- [ ] VSIX installs on the primary dev machine
- [ ] extension activates without obvious errors
- [ ] sidebar appears correctly
- [ ] walkthrough assets and icon render correctly
- [ ] chat view opens correctly

### 2. Account and Entitlements

- [ ] Connect Account opens the correct browser flow
- [ ] callback returns to `rinawarp.rinawarp-companion`
- [ ] account snapshot updates in the extension
- [ ] Refresh Entitlements updates state correctly
- [ ] paid account reflects expected plan state
- [ ] unpaid account fails honestly and clearly

### 3. Free Diagnostic Flow

- [ ] diagnostic can be run from the sidebar
- [ ] diagnostic output is useful, not placeholder-feeling
- [ ] diagnostic works in a trusted workspace
- [ ] recommended next step or pack feels relevant
- [ ] no obvious misleading claims are made about proof depth

### 4. Pack and Upgrade Handoff

- [ ] Open Packs lands on the intended `/agents` surface
- [ ] pack-specific deep links land on the expected destination
- [ ] Upgrade to Pro lands on the expected pricing flow
- [ ] Billing Portal opens the expected billing surface

### 5. Purchase Return and Recovery

- [ ] purchase success returns to the extension
- [ ] entitlement refresh after purchase behaves correctly
- [ ] if refresh fails, the user sees a clear next step
- [ ] support can handle “I paid but it did not unlock”

### 6. Safety and Positioning

- [ ] Companion messaging matches actual shipped capability
- [ ] Companion does not present itself as full Terminal Pro parity
- [ ] Preview labeling is visible
- [ ] Privacy and telemetry messaging is accurate

## Packaging Review

Confirm the package contents before publish:

- [ ] expected extension files only
- [ ] no local runtime clutter
- [ ] no generated debug artifacts
- [ ] no secrets or local-only state

## Telemetry and Support Readiness

These are required for a real pre-release, even if they are not feature work.

- [ ] install-to-connect behavior is observable
- [ ] connect-account completion is observable
- [ ] free diagnostic completion is observable
- [ ] pack clickthrough is observable
- [ ] upgrade clickthrough is observable
- [ ] purchase-return or entitlement-refresh issues are supportable

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
- [ ] No-Go

Release notes for this decision:

- 
