# Desktop Release Checklist

## Scope
- Product: `RinaWarp Terminal Pro`
- Packaging: `electron-builder`
- Targets:
  - macOS
  - Windows
  - Linux

## Ship Gate
- Feature reality matrix is current and passes:
  - [feature-reality-matrix.md](/home/karina/Documents/rinawarp-terminal-pro/docs/feature-reality-matrix.md)
  - `npm run guard:feature-reality`
- Headless runner tests are green:
  - success receipt/log path
  - timeout receipt/log path
  - prune path
- First-run guarded suite is green:
  - unit/state pass
  - IPC contract pass
  - dev first-run Electron pass
  - packaged first-run pass
- Release-candidate guarded suite is green on the exact candidate:
  - `npm run qa:release-candidate`
- Desktop runs panel remains stable under workspace switching
- Run receipts are versioned and schema-compatible across desktop and headless
- Installer artifacts are produced by CI
- Support bundle export works
- Release metadata is published for update checks
- Versioned release bundle passes `npm run verify:downloads` before any production site deploy

## Signing & Distribution

### macOS
- Configure code signing identity
- Configure notarization credentials
- Produce signed `.dmg` and `.zip`
- Verify Gatekeeper / notarization acceptance on a clean machine

### Windows
- Configure Authenticode signing certificate
- Produce signed `nsis` installer
- Verify install/update flow on a clean VM

### Linux
- Produce `AppImage` and `deb`
- Verify install and startup on a clean distro image

## Auto-Update / Release Metadata
- Publish release manifest:
  - `https://www.rinawarptech.com/releases/latest.json`
- Ensure manifest contains:
  - `version`
  - `releasedAt`
  - `downloadUrl`
- Verify desktop update check from settings/about
- Keep website deploy after artifact publish, not before:
  - [DESKTOP_RELEASE_SEQUENCE.md](/home/karina/Documents/rinawarp-terminal-pro/docs/DESKTOP_RELEASE_SEQUENCE.md)

## Crash & Supportability
- Renderer errors are captured
- Main/renderer crash events are persisted
- Support bundle includes:
  - diagnostics
  - transcript
  - renderer errors
  - crash logs
  - app version / environment metadata
- Test bundle export on packaged app

## Trust & Auditing
- Run receipts include:
  - `receiptVersion`
  - `runId`
  - `workspaceKey`
  - `recipe`
  - timing fields
  - exit fields
- Headless and desktop receipts remain schema-compatible
- Older receipts are safely hydrated/backfilled

## CI
- Pin Node and package manager versions
- Build Electron app in CI
- Package target installers in CI
- Upload artifacts with versioned names
- Publish tagged releases from CI

## Manual Smoke Checks
- Launch the exact release-candidate artifact from [CORE_PATH_BUILD_LOCK.md](/home/karina/Documents/rinawarp-terminal-pro/docs/CORE_PATH_BUILD_LOCK.md)
- Confirm `Settings` responds and opens the settings surface
- Confirm the workspace picker is obvious on first launch
- Confirm the footer/status strip stays at the bottom and reads clearly
- Confirm the Agent empty state explains how to choose a workspace
- Run `self-check` and verify a run starts cleanly
- Open one receipt and confirm proof/actions render correctly
- Restart app and confirm workspace/run restore

## Nice-to-Have Before Broad Release
- Crash reporting backend
- Signed typo-domain redirect / website checklist complete
- Clear run-history UI in desktop settings
- Release notes / changelog generation
