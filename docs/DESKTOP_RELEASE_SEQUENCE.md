# Desktop Release Sequence

This is the canonical publish order for `RinaWarp Terminal Pro`.

Use this when the desktop app is green locally and you are preparing to make a version live on `rinawarptech.com`.

## Rule

Do not deploy the website first.

The website reads the current Terminal Pro version directly from:

- [apps/terminal-pro/package.json](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/package.json)

That means a site deploy can advertise a version before its release artifacts exist unless the release bundle is already prepared. Production deploys are now guarded by:

- [verify-download-links.mjs](/home/karina/Documents/rinawarp-terminal-pro/scripts/verify-download-links.mjs)

## Canonical Order

### 1. Freeze the version

- bump the desktop version
- commit the release-prep change
- do not deploy the site yet

Commands:

```bash
npm run release:bump -- 1.1.10
```

### 2. Verify the app candidate

Commands:

```bash
npm --workspace apps/terminal-pro run release:readiness
```

This must stay green on the exact candidate commit.

### 3. Produce fresh release artifacts

You need a fresh bundle for the exact version:

- Linux AppImage
- Linux `.deb`
- Windows `.exe`
- Windows `.exe.blockmap`

Local Linux packaging command:

```bash
bash deploy/release-runner.sh
```

Windows packaging should come from the Windows release lane or CI workflow:

- [release.yml](/home/karina/Documents/rinawarp-terminal-pro/.github/workflows/release.yml)

### 4. Generate fresh updater metadata

Commands:

```bash
npm --workspace apps/terminal-pro run release:metadata
```

This must produce coherent:

- `latest.json`
- `latest.yml`
- `latest-linux.yml`
- `SHASUMS256.txt`

### 5. Verify the release bundle before publish

Commands:

```bash
npm run verify:downloads
```

This must confirm:

- all required artifacts exist for the current version
- checksums match the actual files
- updater metadata points at the same versioned artifacts

### 6. Publish the desktop release artifacts

Commands:

```bash
npm run release:publish:desktop
```

This uploads:

- versioned installers
- versioned checksums
- updater metadata

Primary implementation:

- [publish-desktop-release.sh](/home/karina/Documents/rinawarp-terminal-pro/scripts/publish-desktop-release.sh)
- [publish-update-metadata.sh](/home/karina/Documents/rinawarp-terminal-pro/scripts/publish-update-metadata.sh)

### 7. Audit the live release endpoints

Commands:

```bash
npm run audit:prod
npm run smoke:prod
```

Confirm:

- `/releases/latest.json` reports the intended live version
- `/download` routes resolve to the same release set
- checksums and manifests are live

### 8. Deploy the website

Commands:

```bash
npm run deploy:pages
```

Production deploy now verifies the release bundle first. If the bundle is stale or incomplete, deploy will stop.

## Current Safe State For 1.1.10

As of `2026-03-29`:

- the app candidate is green
- the version is prepared as `1.1.10`
- production Pages deploy is guarded
- a fresh `1.1.10` multi-platform release bundle still needs to be produced before publish

## Decision Rule

Only move `rinawarptech.com` to a new desktop version after all of the following are true:

- release-readiness passed on the exact version
- AppImage, `.deb`, and `.exe` were produced for that exact version
- `npm run verify:downloads` passes
- release artifacts and updater metadata were published
- live release audit passes
