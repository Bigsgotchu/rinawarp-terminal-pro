# Release Checklist (Human-Readable)

> This is a human-only checklist. For commands, see [launch-readiness.md](launch-readiness.md).

---

## Pre-Flight (Before Release)

- [ ] All artifacts built for target platforms (DMG, EXE, AppImage, DEB)
- [ ] Artifacts signed and notarized (macOS, Windows)
- [ ] Artifact filenames normalized to canonical format:
  - `RinaWarp-Terminal-Pro-{VERSION}.dmg`
  - `RinaWarp-Terminal-Pro-{VERSION}.exe`
  - `RinaWarp-Terminal-Pro-{VERSION}.AppImage`
  - `RinaWarp-Terminal-Pro-{VERSION}.amd64.deb`
- [ ] Cross-platform artifacts collected in `apps/terminal-pro/dist/`
- [ ] Wrangler authenticated (`npx wrangler whoami`)
- [ ] D1 database `rinawarp-prod` exists and has schema

---

## Release Steps

### 1. Set Version

```bash
export VER="1.0.0"
```

### 2. Run Preflight

```bash
./deploy/preflight-release.sh
```

**Preflight checks:**
- [ ] Repo root verified
- [ ] Required artifacts exist
- [ ] Wrangler auth works
- [ ] Website pages return 200

### 3. Generate SHA256 Hashes

```bash
./deploy/update-hashes.sh
```

**This updates:**
- `rinawarptech-website/web/download/index.html` with SHA256 hashes

### 4. Commit Hash Updates

```bash
git add rinawarptech-website/web/download/index.html
git commit -m "Release v$VER: update download SHA256 hashes"
git push
```

### 5. Upload to R2

```bash
./deploy/upload-and-verify.sh
```

**Upload checklist:**
- [ ] All artifacts uploaded to `rinawarp-installers` bucket
- [ ] No 404s on file list
- [ ] Fail-fast passed

### 6. Smoke Test

```bash
./deploy/release-runner.sh  # runs smoke test automatically
```

**Or manual smoke test:**

Seed test entitlement:
```bash
npx wrangler d1 execute rinawarp-prod --command \
"INSERT OR REPLACE INTO entitlements VALUES ('cus_TEST', 'team', 'active', ...)"
```

Mint token:
```bash
TOKEN="$(curl -sS "https://rinawarp-downloads.rinawarptech.workers.dev/api/download-token?customer_id=cus_TEST" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")"
```

**Smoke test checklist:**
- [ ] Token generation works
- [ ] Gated download returns 200 + attachment header
- [ ] No-token download returns 401/403

---

## Post-Release Verification

- [ ] Visit https://www.rinawarptech.com/download
- [ ] Verify all 4 download buttons visible
- [ ] Verify SHA256 hashes match artifacts
- [ ] Test one purchase flow (Stripe test mode)
- [ ] Verify webhook receives event
- [ ] Verify entitlement created in D1

---

## Rollback (If Needed)

If issues are detected:

1. **R2 artifacts wrong:** Re-upload correct artifacts to R2
2. **Hashes wrong:** Re-run `update-hashes.sh` and commit
3. **Website broken:** Revert marketing site deployment
4. **Worker broken:** Redeploy worker with previous version

---

*Last Updated: 2026-02-03*
*See also: [launch-readiness.md](launch-readiness.md), [release-runner.sh](release-runner.sh)*
