# RinaWarp Terminal Pro 1.1.10 Signoff

Desktop release completed from the prepared `1.1.10` candidate.

Date: 2026-03-29

## Automated Release Gate

Verified:

- `npm --workspace apps/terminal-pro run release:readiness`
- `npm run verify:downloads`
- `npm run release:publish:desktop`
- `npm run smoke:prod`

Public release confirmation:

- `https://rinawarptech.com/releases/latest.json` reports `1.1.10`
- production Pages deploy completed successfully
- production updater feeds respond from the first-party domain

## Product State

The shipped surface now reflects the recent desktop work:

- cleaner Agent startup
- less block-heavy transcript styling
- improved shell hierarchy
- release/download bundle aligned with the live website

## Operational Note

`audit:prod` now points at the canonical first-party checksum surface:

- `https://www.rinawarptech.com/releases/SHASUMS256.txt`

This replaces the old worker checksum URL that was returning `404`.

## Follow-Up, Not Blocker

- Windows signing should still be added in the proper signing environment for future releases
- the release audit and launch docs can now treat `1.1.10` as the live desktop baseline
