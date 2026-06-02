# RinaWarp Terminal Pro Release Evidence

## Release Classification
Production-candidate controlled execution desktop app.

## Final Gate Result
**PASS** - Linux artifacts, updater metadata, packaged core loop, safe mutation, and production environment gates validated.

## OS
Linux karina 6.19.14+kali-amd64 #1 SMP PREEMPT_DYNAMIC Kali 6.19.14-1+kali1 (2026-05-05) x86_64 GNU/Linux

## Node
v22.22.2

## Electron
35.7.5 package runtime

## electron-builder
25.1.8

## Packaging Output
```
-rwxr-xr-x karina karina 124014452 2026-06-02 04:06:16 -0600 RinaWarp-Terminal-Pro-1.8.2-beta-linux-x86_64.AppImage
-rw-rw-r-- karina karina  85033536 2026-06-02 04:07:57 -0600 RinaWarp-Terminal-Pro-1.8.2-beta-linux-amd64.deb
-rw-rw-r-- karina karina       236 2026-06-02 04:08:46 -0600 SHASUMS256.txt
-rw-rw-r-- karina karina       410 2026-06-02 04:07:59 -0600 latest-linux.yml
-rw-rw-r-- karina karina      1034 2026-06-02 04:08:46 -0600 beta/latest.json
```

## Test Results
```
npm --workspace apps/terminal-pro run build:electron - PASS
npm --workspace apps/terminal-pro run release:metadata - PASS
npm --workspace apps/terminal-pro run verify:update-artifacts - PASS
npm --workspace apps/terminal-pro run dist - PASS
node apps/terminal-pro/test/plan-risk.test.mjs - PASS (10/10)
node apps/terminal-pro/test/rina-agent-safe-patch.test.mjs - PASS (13/13)
npx playwright test apps/terminal-pro/tests/e2e/packaged-first-run.spec.ts --reporter=list - PASS (4/4)
npx playwright test apps/terminal-pro/tests/e2e/safe-mutation.spec.ts --reporter=list - PASS (1/1)
npx playwright test apps/terminal-pro/tests/e2e/production-env-audit.spec.ts --reporter=list - PASS (3/3)
```

## Smoke Result
Packaged Electron proof path passed through Playwright with a fresh HOME/user-data path:
- launch from linux-unpacked
- auto-select fixture workspace only under RINAWARP_E2E=1
- run build prompt
- show run block, exit state, and proof
- export JSON with receiptId and proofBlockIds
- quit/reopen and preserve history/proof

Note: packaged Playwright launch requires running outside the command sandbox because local Electron GUI launch fails under the sandbox with a Chromium sandbox fatal. The packaged gate passed when run unsandboxed.

## Updater Metadata
```
release:metadata generated beta/latest.json for 1.8.2-beta.
verify:update-artifacts confirmed latest-linux.yml references the AppImage and matches sha512.
```

## Artifact SHA256
```
60ef9f5c575fb15cb899e298c54ed0ef10fa815a07a6ed9eae77ac24a1f1f4f0  RinaWarp-Terminal-Pro-1.8.2-beta-linux-x86_64.AppImage
a8bce8576ca9eb45ce8b89217993960b970fce480a0ee54adba31b020cfabcea  RinaWarp-Terminal-Pro-1.8.2-beta-linux-amd64.deb
```
