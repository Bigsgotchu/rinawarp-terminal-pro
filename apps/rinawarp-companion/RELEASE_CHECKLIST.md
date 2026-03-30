# Release Checklist

## Before Packaging

- [ ] `npm --workspace apps/rinawarp-companion run build` passes
- [ ] `README.md`, `CHANGELOG.md`, `SUPPORT.md`, and `telemetry.json` reflect current behavior
- [ ] icon and walkthrough media look correct
- [ ] account connect still returns to the extension
- [ ] `/api/vscode/entitlements` reflects current billing state correctly
- [ ] free diagnostic still produces a useful summary in a trusted workspace
- [ ] recommended pack deep links land on the expected pack in `/agents`
- [ ] purchase success returns to VS Code and entitlement refresh works or fails honestly

## Before Marketplace Publish

- [ ] package a local VSIX
- [ ] install the VSIX in VS Code
- [ ] test on a clean profile if possible
- [ ] verify no unwanted files are included in the package
- [ ] verify the extension still behaves acceptably in Restricted Mode
- [ ] confirm pricing links, privacy links, and support links point to live pages

## Pre-release Launch

- [ ] publish as pre-release
- [ ] verify Marketplace listing copy and assets
- [ ] verify Preview labeling is visible
- [ ] monitor support and telemetry for connect, diagnostic, pack-open, and purchase-return flow quality

## Full Release Gate

- [ ] first proof-backed workflow feels real, not scaffolded
- [ ] entitlement refresh is reliable enough for paid customers
- [ ] no obvious broken onboarding steps
- [ ] support path is ready for live user issues
