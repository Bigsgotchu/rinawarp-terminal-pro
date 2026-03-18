# Desktop Release Checklist

## Scope
- Product: `RinaWarp Terminal Pro`
- Packaging: `electron-builder`
- Targets:
  - macOS
  - Windows
  - Linux

## Ship Gate
- Headless runner tests are green:
  - success receipt/log path
  - timeout receipt/log path
  - prune path
- Desktop runs panel remains stable under workspace switching
- Run receipts are versioned and schema-compatible across desktop and headless
- Installer artifacts are produced by CI
- Support bundle export works
- Release metadata is published for update checks

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
- Launch app on clean machine
- Open workspace
- Run build/test command through Rina
- Verify receipt/log creation
- Restart app and confirm workspace/run restore
- Export support bundle
- Check update settings panel

## Nice-to-Have Before Broad Release
- Crash reporting backend
- Signed typo-domain redirect / website checklist complete
- Clear run-history UI in desktop settings
- Release notes / changelog generation
