# RinaWarp Terminal Pro 1.1.9 RC1 Handoff

Date: 2026-03-23

## RC Anchor

- RC tag: `v1.1.9-rc1`
- Freeze commit: `12a0b3a`
- Freeze commit message:
  - `release(desktop): freeze 1.1.9 RC1 with truth gates and packaged E2E green`

## Canonical Verifier

Run:

```bash
npm run verify:desktop:rc
```

This is the authoritative desktop RC gate for this candidate.

## Blocker Policy

Only reopen code for verified release blockers in these areas:

- first run
- workspace selection
- settings navigation
- help and capabilities routing
- self-check and proof
- receipts and recovery
- packaged launch, install, or updater

Everything else is post-RC.

## Deferred Non-Blockers

Do not interrupt the RC for these classes unless they escalate into a blocker:

- cosmetic polish
- copy tuning that does not change user trust
- internal cleanup or refactor work
- additional architecture reshaping
- extra automation or ecosystem work
- non-critical UI polish

## Notes

- The RC signoff and sanity summary live in [RELEASE_SIGNOFF_1.1.9.md](/home/karina/Documents/rinawarp-terminal-pro/docs/RELEASE_SIGNOFF_1.1.9.md).
- The stable RC checklist lives in [desktop-rc-checklist.md](/home/karina/Documents/rinawarp-terminal-pro/docs/release/desktop-rc-checklist.md).
- Local machine artifacts and scratch data are intentionally not part of the RC freeze.
