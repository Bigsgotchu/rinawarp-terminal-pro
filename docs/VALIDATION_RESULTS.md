# Validation Results

## 2026-05-26T23:50:34-06:00

Workspace: `/home/karina/Documents/rinawarp-production`

Commit: `e7e10c41`

Branch: `v1.6.1-beta-hardening`

Package version observed during validation: `1.5.0-beta`

## Starting Worktree State

`git status` was not clean.

Modified files:

- `apps/terminal-pro/package.json`
- `package.json`
- `scripts/release/publish-update-metadata.sh`

Untracked files:

- `apps/terminal-pro/scripts/verify-electron-update-artifacts.mjs`
- `docs/COMPANY_READINESS_CHECKLIST.md`
- `scripts/check-updater.sh`

## Passed

- `npm --workspace apps/terminal-pro run test:rina-runtime`
  - Passed after rerun outside the read-only sandbox.
  - Runtime test output reported all TAP tests passing.
- `npm --workspace packages/rina-doctor run test:trust`
  - Passed.
  - Output: `trust-loop checks passed`
- `corepack pnpm build`
  - Passed.
  - Renderer, preload, TypeScript build, and static asset copy completed.

## Failed

- `corepack pnpm dist:desktop`
  - Failed before desktop packaging.
  - Root cause: root `dist:desktop` script invokes bare `pnpm --filter rinawarp-terminal-pro dist`.
  - Failure: `sh: 1: pnpm: not found`
- `UPDATER_BASE_URL=https://rinawarptech.com/releases npm run check:updater`
  - First run failed under restricted sandbox DNS.
  - Escalated rerun reached the host but failed with HTTP 500.
  - Failing URL: `https://rinawarptech.com/releases/latest-linux.yml`

## Blockers

- Production workspace release script still depends on bare `pnpm`; release discipline requires `corepack pnpm`.
- Live updater feed is not serving `latest-linux.yml` successfully from `https://rinawarptech.com/releases`.
- Production workspace is not clean and appears version-skewed: package output reported `1.5.0-beta` while branch name is `v1.6.1-beta-hardening`.

## Next Actions

- Update production root `dist:desktop` script to use `corepack pnpm --filter rinawarp-terminal-pro dist`.
- Resolve the updater feed HTTP 500 for `/releases/latest-linux.yml`.
- Re-run:
  - `git status`
  - `npm --workspace apps/terminal-pro run test:rina-runtime`
  - `npm --workspace packages/rina-doctor run test:trust`
  - `corepack pnpm build`
  - `corepack pnpm dist:desktop`
  - `UPDATER_BASE_URL=https://rinawarptech.com/releases npm run check:updater`
- Confirm whether production should remain at `1.5.0-beta`, advance to the branch target, or receive the v1.7.1/v1.8 validation docs from the active development workspace.

## 2026-05-27T03:45:18-06:00

Workspace: `/home/karina/Documents/rinawarp-production`

Commit: `ad7e59a99740359d4bee40fad2498ffa3e399159`

Branch: `main`

Package version observed during validation: `1.7.1-beta`

## Passed

- `npm --workspace apps/terminal-pro run test:rina-runtime`
  - Passed (runtime gate)
- `npm --workspace packages/rina-doctor run test:trust`
  - Passed (`trust-loop checks passed`)
- `corepack pnpm build`
  - Passed (includes `apps/terminal-pro` electron build)
- `corepack pnpm dist:desktop`
  - Passed (linux packaging + update metadata verification)

## Next checkpoint: `v1.8.0-beta` daily-driver validation

Use the packaged app on real work and track what fails, confuses, or earns trust.

## v1.8.0-beta Updater Validation — YYYY-MM-DD

### Goal

Prove installed users can update from `1.7.1-beta` to `1.8.0-beta` through GitHub Releases without manually reinstalling.

### Baseline

- [ ] Install/open `RinaWarp-Terminal-Pro-1.7.1-beta.AppImage`
- [ ] Confirm app version shows `1.7.1-beta`
- [ ] Confirm updater feed uses GitHub Releases
- [ ] Core smoke passes before update:
  - [ ] Agent Thread visible
  - [ ] Composer visible
  - [ ] One prompt works

### Release

- [ ] Publish `v1.8.0-beta` GitHub Release
- [ ] Upload:
  - [ ] AppImage
  - [ ] `.deb`
  - [ ] `latest-linux.yml`
  - [ ] `latest.yml`
  - [ ] `SHASUMS256.txt`
- [ ] Run:

```bash
UPDATER_BASE_URL=https://github.com/Bigsgotchu/rinawarp-terminal-pro/releases/download/v1.8.0-beta \
npm run check:updater
```

### Update Test

- [ ] Launch installed `1.7.1-beta`
- [ ] Trigger/check for update
- [ ] App detects `1.8.0-beta`
- [ ] Update downloads successfully
- [ ] Restart to update appears
- [ ] Restart/apply update
- [ ] App reopens
- [ ] Version now shows `1.8.0-beta`

### Post-Update Smoke

- [ ] Agent Thread visible
- [ ] Ask: What does this project do?
- [ ] Receipt/proof block appears
- [ ] No crash
- [ ] No reinstall required

### Result

- **Status:** PASS / FAIL
- **Notes:**
  - What failed or confused the user?
  - Did the update feel trustworthy?
  - Did the status messages explain what was happening?

### Engineering Outcome

- [ ] no action needed
- [ ] runtime test
- [ ] trust test
- [ ] UX refinement
- [ ] updater hardening

Use GitHub Releases for beta updater validation. Do not move back to R2 until GitHub has several successful update cycles.

## v1.8.0-beta Daily Driver Entry — 2026-05-27

### Category

- Runtime test
- Trust test
- Verification improvement

### Task

Run the immediate release-readiness baseline for the current packaged desktop build before the first real `1.7.1-beta` to `1.8.0-beta` updater cycle.

### Result

- `npm --workspace apps/terminal-pro run test:rina-runtime`
  - Passed.
- `npm --workspace packages/rina-doctor run test:trust`
  - Passed (`trust-loop checks passed`).
- `corepack pnpm build`
  - Passed.
- `corepack pnpm --filter rinawarp-terminal-pro dist`
  - Initially failed because the app-level `dist` script invoked bare `pnpm`.
  - Passed after changing the app-level `dist` script to call `npm run dist:linux && npm run release:metadata && npm run verify:update-artifacts`.
  - Produced AppImage and `.deb` artifacts for `1.7.1-beta`.
  - Generated `latest.yml` and `latest-linux.yml`.
  - Verified updater metadata freshness for `1.7.1-beta`.

### Trust Impact

The runtime, trust loop, build, Linux packaging, and updater metadata checks all pass locally. The remaining trust gap is still the real installed-customer updater path from `1.7.1-beta` to `1.8.0-beta`.

### Expected Behavior

Release-readiness commands should not depend on a globally installed `pnpm`; they should run through the repo's package-manager path and produce fresh updater metadata.

### Engineering Outcome

- verification improvement
- updater hardening
