# RinaWarp Terminal Pro 1.1.9

Release type: guarded release

Date: 2026-03-22

## Summary

`1.1.9` is the first release cut behind the new customer-journey regression stack.

This is not a victory-lap release. It is a guarded stability release focused on first-run trust, packaged-app correctness, and preventing a repeat of recent onboarding bugs.

## Fixed

- fixed packaged-app Settings navigation regression
- fixed packaged-app self-check routing so `scan yourself` starts a real self-check run
- fixed packaged help routing so `what can u do` stays a capabilities reply
- fixed weak-workspace footer summary being masked by generic `Ready` copy
- fixed first-run workspace guidance so generic folders like `Downloads` are treated as weak context
- fixed first-run shell discoverability with a persistent top-bar workspace picker

## Added

- added first-run customer journey coverage
- added packaged Linux end-to-end validation
- added packaged regression coverage for `what can u do` and `scan yourself`
- added IPC contract coverage for critical renderer bridges
- added pure state/render consistency coverage for workspace and footer state

## Reliability Improvements

- improved first-run reliability and navigation trust
- strengthened IPC/state/render regression coverage
- made packaged first-run behavior part of the guarded release path

## Permanent Regression Note

Named regression:

- `packaged-settings-button-opens-panel`

What happened:

- in packaged builds, clicking the visible Settings nav button opened and then immediately closed because the direct button handler and delegated navigation handler fought each other

What prevents recurrence:

- packaged first-run customer-journey test
- explicit IPC/dev first-run checks
- guarded release path requiring packaged first-run validation

## Guarded Release Evidence

- `npm --workspace apps/terminal-pro run test:unit -- first-run-status.test.ts`
- `npm --workspace apps/terminal-pro run test:agent`
- `bash apps/terminal-pro/scripts/run-electron-playwright.sh tests/e2e/agent-empty-state.spec.ts tests/e2e/ipc-contracts.spec.ts`
- `npm --workspace apps/terminal-pro run test:e2e:packaged-first-run`
