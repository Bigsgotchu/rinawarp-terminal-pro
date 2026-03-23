# Revenue Execution Checklist

This is the short operational checklist for moving from the frozen desktop RC to a revenue-capable launch.

Use this with:

- [REVENUE_LAUNCH_PLAN.md](/home/karina/Documents/rinawarp-terminal-pro/docs/REVENUE_LAUNCH_PLAN.md)
- [LIVE_REVENUE_RUNBOOK.md](/home/karina/Documents/rinawarp-terminal-pro/docs/LIVE_REVENUE_RUNBOOK.md)

## Phase 1: Revenue-Critical

- [ ] Promote `v1.1.9-rc1` to the final desktop release if no blocker appears.
- [ ] Publish the final desktop artifacts users are meant to install.
- [ ] Verify the updater/feed points to the same final release.
- [ ] Verify the download page points to one canonical release artifact path.
- [ ] Verify a brand-new customer can go from website to paid unlocked desktop app without manual help.
- [ ] Verify restore purchase works for a returning customer.
- [ ] Verify downgrade or expired-license behavior is understandable and honest.
- [ ] Verify the first-run workspace picker, help path, and self-check path remain obvious.

## Phase 2: Conversion-Critical

- [ ] Keep one simple product story:
  - `RinaWarp Terminal Pro`
  - proof-first agent workbench
  - build, test, deploy
- [ ] Keep one simple paid story:
  - free tier or trial
  - one paid Pro plan
- [ ] Tighten homepage copy so the trust/proof wedge is obvious in seconds.
- [ ] Tighten pricing copy so it matches real app unlocks.
- [ ] Tighten download page copy so supported platforms and install guidance are honest.
- [ ] Add current screenshots or a short demo showing the real first-run and proof-backed workflow.

## Phase 3: Growth-Critical

- [ ] Measure homepage traffic.
- [ ] Measure pricing visits.
- [ ] Measure download clicks.
- [ ] Measure checkout start.
- [ ] Measure checkout completion.
- [ ] Measure app unlock and activation.
- [ ] Measure workspace selection, first prompt, self-check, and first successful trusted run.
- [ ] Measure return usage and repeated trusted runs.

## Revenue Blockers

Treat these as blockers before public launch:

- [ ] final release not promoted from the RC
- [ ] checkout does not reliably unlock the app
- [ ] restore purchase does not reliably work
- [ ] download/install path is confusing or inconsistent
- [ ] updater/feed does not match the final release
- [ ] new users do not understand how to start
- [ ] pricing or website claims do not match the app

## Non-Blockers

Do not delay the initial revenue launch for:

- [ ] cosmetic-only polish
- [ ] internal cleanup or refactors
- [ ] additional ecosystem or capability expansion
- [ ] non-critical UI tuning
- [ ] extra architecture work that does not improve release, billing, conversion, or activation
