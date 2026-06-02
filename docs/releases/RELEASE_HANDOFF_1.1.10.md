# RinaWarp Terminal Pro 1.1.10 Release Handoff

Date: 2026-03-29

## Release Anchor

- target version: `1.1.10`
- prep commit: `ee56ce8`
- latest desktop analytics commit in scope: `9d2b4d5`
- canonical release sequence:
  - [DESKTOP_RELEASE_SEQUENCE.md](/home/karina/Documents/rinawarp-terminal-pro/docs/DESKTOP_RELEASE_SEQUENCE.md)

## What Is Already True

- Terminal Pro `1.1.10` builds locally
- `npm --workspace apps/terminal-pro run release:readiness` passed on the prepared candidate before the version bump
- production Pages deploy is now guarded so the website cannot advertise a version whose desktop artifacts are missing or inconsistent
- `npm run verify:downloads` is expected to fail until fresh `1.1.10` artifacts exist

## What Still Must Happen Before Publish

A fresh `1.1.10` release bundle must be produced from the same source state:

- `RinaWarp-Terminal-Pro-1.1.10.AppImage`
- `RinaWarp-Terminal-Pro-1.1.10.deb`
- `RinaWarp-Terminal-Pro-1.1.10.exe`
- `RinaWarp-Terminal-Pro-1.1.10.exe.blockmap`
- `latest.json`
- `latest.yml`
- `latest-linux.yml`
- `SHASUMS256.txt`

## Owner Split

### Linux lane

Owner responsibilities:

- produce fresh Linux AppImage
- produce fresh Linux `.deb`
- confirm local installer directory contains `1.1.10` Linux artifacts, not mixed `1.1.9`

Primary command:

```bash
bash deploy/release-runner.sh
```

### Windows lane

Owner responsibilities:

- produce fresh signed or release-grade Windows `.exe`
- produce fresh `.exe.blockmap`
- deliver artifacts into the canonical release bundle

Primary source of truth:

- [release.yml](/home/karina/Documents/rinawarp-terminal-pro/.github/workflows/release.yml)

Recommended operator sequence:

1. run the Windows packaging lane for `1.1.10`
2. collect the produced `.exe` and `.exe.blockmap`
3. place them into:
   - `apps/terminal-pro/dist-electron/installer/`
4. do not publish metadata before the Windows artifact is present

## Exact Publish Sequence

Run these only after all `1.1.10` artifacts are present in:

- `apps/terminal-pro/dist-electron/installer/`

### 1. Verify the bundle

```bash
npm run verify:downloads
```

Expected:

- command exits `0`
- checksums match
- metadata matches the exact `1.1.10` artifact names

### 2. Publish versioned binaries and metadata

```bash
npm run release:publish:desktop
```

This publishes:

- versioned installers to R2
- versioned checksums
- updater metadata

### 3. Audit the live release surface

```bash
npm run audit:prod
npm run smoke:prod
```

Expected:

- `https://rinawarptech.com/releases/latest.json` reports `1.1.10`
- `https://rinawarptech.com/download/` points at the `1.1.10` set
- checksums and manifests are coherent

### 4. Deploy the website

```bash
npm run deploy:pages
```

Production deploy should now pass because the download bundle exists and matches the current app version.

## Stop Conditions

Do not publish or deploy if any of these are true:

- `npm run verify:downloads` fails
- any `1.1.10` artifact is missing
- `latest.json` still points at an older version
- AppImage, `.deb`, and `.exe` were produced from different source states
- release-readiness is red on the candidate commit

## Final Go/No-Go Rule

You can move `rinawarptech.com` to `1.1.10` only after:

- fresh Linux and Windows artifacts exist
- `npm run verify:downloads` is green
- `npm run release:publish:desktop` completed successfully
- `npm run audit:prod` is green
- `npm run smoke:prod` is green

Until then, keep the public website on the previous live release.
