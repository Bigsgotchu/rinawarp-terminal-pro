# Release Checklist (Human-Readable)

> This is a human-only checklist. For commands, see [launch-readiness.md](launch-readiness.md).

---

## Pre-Flight (Before Release)

- [ ] All artifacts built for current target platforms (EXE, AppImage, DEB)
- [ ] Release signatures verified (`SHASUMS256.txt` + `.asc` + pubkey)
- [ ] Artifact filenames normalized to canonical format:
  - `RinaWarp-Terminal-Pro-{VERSION}.exe`
  - `RinaWarp-Terminal-Pro-{VERSION}.AppImage`
  - `RinaWarp-Terminal-Pro-{VERSION}.amd64.deb`
- [ ] Cross-platform artifacts collected in `apps/terminal-pro/dist/`
- [ ] Wrangler authenticated (`npx wrangler whoami`)
- [ ] D1 database `rinawarp-prod` exists and has schema
- [ ] `downloads-worker/wrangler.toml` has `RELEASE_VERSION="{VERSION}"`
- [ ] Website hardcoded version strings updated:
  - `web/download.html`
  - `web/account/index.html`
  - `rinawarptech-website/web/download.html`
  - `rinawarptech-website/web/account/index.html`

---

## Release Steps

### 1. Set Version

```bash
export VER="$(node -p "require('./apps/terminal-pro/package.json').version")"
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
- [ ] Required artifacts in `apps/terminal-pro/dist` exist
- [ ] Agent parity gates pass (`bash deploy/agent-parity-gates.sh`)

### 3. Generate Metadata + Signatures

```bash
npm run verify:downloads
./deploy/update-hashes.sh
./deploy/sign-release.sh
./deploy/verify-release-signatures.sh
```

**This updates:**
- `rinawarptech-website/web/releases/v{VERSION}.json`
- `rinawarptech-website/releases/v{VERSION}.json`
- `release/v{VERSION}/SHASUMS256.txt` (+ signature + pubkey)

### 4. Optional Commit Metadata

```bash
git add \
  apps/terminal-pro/package.json \
  rinawarptech-website/web/releases/v$VER.json \
  rinawarptech-website/releases/v$VER.json \
  release/v$VER/SHASUMS256.txt \
  release/v$VER/SHASUMS256.txt.asc \
  release/v$VER/RINAWARP_GPG_PUBLIC_KEY.asc
git commit -m "Release v$VER: metadata and signatures"
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

### 6. Smoke Test + Audit

```bash
./deploy/release-runner.sh  # runs installer smoke + agent parity gates + production audit
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
- [ ] `content-disposition` filename matches current version
- [ ] `npm run audit:prod` passes

---

## Post-Release Verification

- [ ] `npm run deploy:pages`
- [ ] Visit https://www.rinawarptech.com/download
- [ ] Verify current version appears on download page and account page
- [ ] Verify SHA256 hashes match artifacts
- [ ] Verify `/releases/v{VERSION}.json` hash values match worker `/verify/SHASUMS256.txt`
- [ ] Test one purchase/login/download flow

---

## Rollback (If Needed)

If issues are detected:

1. **R2 artifacts wrong:** Re-upload correct artifacts to R2
2. **Hashes wrong:** Re-run `update-hashes.sh` and commit
3. **Website broken:** Revert marketing site deployment
4. **Worker broken:** Redeploy worker with previous version

---

*Last Updated: 2026-03-03*
*See also: [launch-readiness.md](launch-readiness.md), [release-runner.sh](release-runner.sh)*
