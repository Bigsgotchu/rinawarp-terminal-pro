# Updater Release Proof Checklist

This checklist exists to prove that the current updater architecture is not just present, but shippable.

Current updater model:

- library: `electron-updater`
- provider style: self-hosted / generic HTTP(S) feed
- metadata hosted by RinaWarp
- binaries hosted by RinaWarp

This is the supported model for:

- Windows NSIS
- Linux AppImage

It is not the same thing as package-manager-native updates.

## Source Of Truth

### App-side updater logic

- [`updateService.ts`](../apps/terminal-pro/src/main/update/updateService.ts)
- [`registerUpdateIpc.ts`](../apps/terminal-pro/src/main/ipc/registerUpdateIpc.ts)

### Build/package config

- [`package.json`](../apps/terminal-pro/package.json)
- [`electron-builder.yml`](../apps/terminal-pro/electron-builder.yml)

### Published metadata

- `https://rinawarptech.com/releases/latest.json`
- `https://rinawarptech.com/releases/latest.yml`
- `https://rinawarptech.com/releases/latest-linux.yml`

### Published binaries

- public R2 installer/update artifacts
- release download routes on `rinawarptech.com`

## Required Truths

- [ ] Every production-capable build points to the same canonical feed base URL.
- [ ] No shipped build still points at an old test, local, or temporary feed.
- [ ] The version in the app matches the published version metadata.
- [ ] The metadata artifact URLs match the actual uploaded binaries.
- [ ] The metadata hashes match the uploaded binaries.
- [ ] The website download routes and updater feed refer to the same release set.

## App Wiring Checks

- [ ] `updateService.ts` is the single app-side updater authority.
- [ ] `registerUpdateIpc.ts` exposes the update actions used by the renderer.
- [ ] `checkForUpdate` works from an installed build.
- [ ] `installUpdate` works on supported targets.
- [ ] update state is observable in the UI.
- [ ] update events are logged clearly enough to diagnose failures.

## Release Metadata Checks

- [ ] `latest.json` reports the same version that is intended to be live.
- [ ] `latest.yml` points to the correct Windows artifact and checksum.
- [ ] `latest-linux.yml` points to the correct Linux artifact and checksum.
- [ ] uploaded binaries exist at the exact referenced paths.
- [ ] no stale metadata from the previous release is still being served.

## Target Checks

### Windows

- [ ] target is auto-updatable (`NSIS`)
- [ ] installed production build can check, find, download, and stage/apply update
- [ ] restart/apply UX is acceptable
- [ ] proof logs are captured for the full update path

### Linux

- [ ] AppImage can check, find, download, and stage update
- [ ] feed points to the real AppImage artifact
- [ ] update staging path is observable and verified
- [ ] `.deb` is treated honestly as install path vs updater path

### macOS

- [ ] intentionally unavailable until signing/notarization is complete

## Proof Runs

### Minimum proof sequence

- [ ] install version `N`
- [ ] publish version `N+1`
- [ ] installed app detects `N+1`
- [ ] installed app downloads `N+1`
- [ ] downloaded/staged artifact matches metadata
- [ ] app offers or applies restart/update as designed

### Current known proof state

- [x] Linux AppImage detect/download/stage proof completed
- [ ] Windows in-app updater proof still needs completion
- [ ] full broad-launch updater parity is not yet claimed

## Smoke Coverage

- [ ] update UI smoke exists for supported targets
- [ ] release metadata smoke runs against live endpoints
- [ ] installer/download smoke runs against live routes
- [ ] updater logs are easy to inspect after a failure
- [ ] support can tell whether a user is on stale build, wrong channel, or failed update

## Risk Gaps

- Windows in-app updater proof is still open.
- Same-version rebuilds can confuse local validation unless the release version is bumped.
- Self-hosted metadata makes cache correctness and artifact synchronization your responsibility.
- `.deb` install success does not automatically equal `.deb` updater parity.

## Release Decision Rule

You can say:

> publish once, everyone on the supported channel can update

only when all of the following are true:

- [ ] one canonical feed base URL is confirmed
- [ ] live metadata matches uploaded binaries
- [ ] Windows proof is complete
- [ ] Linux proof is complete
- [ ] update logging is sufficient for support/debugging

Until then, the honest statement is:

> the updater architecture is correct, and Linux is proven; Windows still needs end-to-end proof
