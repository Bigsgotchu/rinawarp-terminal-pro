# Post-Release Operations For 1.1.10

Date: 2026-03-29

`1.1.10` is live. This is the minimum operating loop for the first days after release.

## Daily Commands

Run:

```bash
npm run kpi:snapshot
npm run report:revenue-daily
npm run smoke:prod
npm run audit:prod
```

## What To Watch

- public release version remains `1.1.10`
- pricing and download pages stay reachable
- first-party API health at `https://www.rinawarptech.com/api/health` stays `200`
- Stripe smoke remains green
- updater feeds stay available from the first-party domain

## Known Follow-Up

- the legacy worker checksum URL is no longer the primary release surface
- Windows signing is still a follow-up quality improvement for the next release

## Immediate Response Rule

If any of these fail:

- `smoke:prod`
- `audit:prod`
- `smoke:stripe`

stop launch changes and treat it as a production issue before shipping anything else.
