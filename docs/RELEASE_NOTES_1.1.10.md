# RinaWarp Terminal Pro 1.1.10

Release type: live desktop release

Date: 2026-03-29

## Summary

`1.1.10` is the release that turns the recent Terminal Pro product work into a coherent public distribution state.

This release is about three things:

- the Agent surface now reads more like a professional transcript and less like stacked product blocks
- the desktop release and website release are now guarded so the site cannot outrun the actual artifact set
- activation analytics are in place for the founder-level funnel

## Added

- added explicit Terminal Pro activation events:
  - `workspace_selected`
  - `first_prompt_sent`
  - `restore_purchase_succeeded`
  - `restore_purchase_failed`
- added release-bundle verification before production Pages deploy
- added a documented desktop release sequence and `1.1.10` handoff checklist

## Improved

- simplified the Agent startup state so the thread starts quieter
- tightened transcript styling so replies feel more like a clean chat surface
- improved shell hierarchy and inspector readability
- aligned release and updater metadata with the canonical `rinawarptech.com` release path

## Release Operations

- fresh `1.1.10` Linux and Windows artifacts were produced
- updater metadata and checksums were regenerated from the fresh artifact set
- versioned release artifacts were published to R2
- `rinawarptech.com/releases/latest.*` now points to `1.1.10`
- `rinawarptech.com` was deployed only after the guarded release bundle check passed

## Known Note

- the Windows `.exe` was built and published from this environment without code signing configured, so Windows signing remains a follow-up release-quality improvement rather than a blocker to this publish

## Evidence

- `npm --workspace apps/terminal-pro run release:readiness`
- `npm run verify:downloads`
- `npm run release:publish:desktop`
- `npm run smoke:prod`
