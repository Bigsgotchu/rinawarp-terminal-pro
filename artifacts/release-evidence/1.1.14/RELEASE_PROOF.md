# Release Proof — v1.1.14

Generated: 2026-04-14 America/Denver

## 1) Release pipeline status
- GitHub Actions run: `Release Desktop` run `24437327102`
- Result: `success` (prepare, package-linux, package-windows, publish)
- Release: https://github.com/Bigsgotchu/rinawarp-terminal-pro/releases/tag/v1.1.14

## 2) Linux artifact install/package verification
- Debian package downloaded from `v1.1.14` and extracted on-device at:
  - `/tmp/rinawarp-release-proof/deb-extracted/opt/RinaWarp Terminal Pro/resources/app.asar`
- Verification JSON:
  - `artifacts/release-evidence/1.1.14/packaged-artifact-verification.json`
- `app.asar` contains:
  - `/dist-electron/policy/rinawarp-policy.yaml`
  - `/dist-electron/themes/themes.json`

## 3) Runtime diagnostics + policy enforcement proof
Captured at `2026-04-15T05:22:44.460Z` from installed packaged binary:
- Executable: `/tmp/rinawarp-release-proof/deb-extracted/opt/RinaWarp Terminal Pro/rinawarp-terminal-pro`
- Metadata: `capture-metadata.json`

Exported evidence files:
- `diagnostics.packaged.json`
- `policy-block-result.packaged.json`
- `support-bundle-result.packaged.json`
- `rinawarp-support-bundle-e2e-1776230564455-96b4b6e4.zip`

Key fields from diagnostics:
- `resolved.policyYaml.exists = true`
- `active.policyYamlPath` is non-null and points to:
  - `/tmp/rinawarp-release-proof/deb-extracted/opt/RinaWarp Terminal Pro/resources/app.asar/dist-electron/policy/rinawarp-policy.yaml`

Policy-block execution proof:
- Attempted high-impact command: `rm -rf /tmp/rinawarp-policy-check`
- Result: `ok: false`, `code: PLAN_HALTED`
- Halt reason: `[profile] Approval required for high-impact command.`

Uploaded to GitHub release assets (`v1.1.14`):
- `capture-metadata.json`
- `diagnostics.packaged.json`
- `policy-block-result.packaged.json`
- `support-bundle-result.packaged.json`
- `rinawarp-support-bundle-e2e-1776230564455-96b4b6e4.zip`
