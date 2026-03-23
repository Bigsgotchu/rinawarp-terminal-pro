# Feature Reality Matrix

This document answers one question:

`Is this feature actually real in the shipped product?`

A feature is only `real` when the full chain is real:

`UI -> action -> handler -> result -> proof -> packaged behavior`

## Status Rules

- `real`: customer-visible, wired, produces a truthful result, and is covered by proof or an explicit packaged/runtime check
- `partial`: visible and partly wired, but one part of the chain is still weak, indirect, or insufficiently proven
- `not real`: visible concept exists, but the backing path is missing, disabled, or not truthful enough to claim as complete

## Release Guard Baseline

These guards are part of the reality standard and should stay mandatory:

- `npm run guard:no-stubs`
- `npm run guard:no-fake-success`
- `npm run guard:intent-contracts`
- `npm run guard:single-owner-events`
- `npm run verify:desktop:rc`

## Matrix

| Feature | UI exists | Action bound | Real handler | Real result | Proof / receipt | Packaged / release check | Tests | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Agent conversation (`hi`, help, capabilities) | yes | yes | yes | yes | n/a | yes | yes | real | Help/capability prompts are intentionally conversational and should not create work. |
| Workspace picker | yes | yes | yes | yes | n/a | yes | yes | real | Customer-visible first-run path with persistence and weak-workspace handling. |
| Settings shell | yes | yes | yes | yes | n/a | yes | yes | real | Modern shell is default; packaged regression coverage exists. |
| Self-check (`scan yourself`) | yes | yes | yes | yes | yes | yes | yes | real | Creates a real run and proof-backed receipt path. |
| Build / Test intents | yes | yes | yes | yes | yes | partial | yes | partial | Runtime/proof path is real, but packaged customer-seat validation should stay part of release discipline. |
| Deploy plan entry | yes | yes | yes | yes | partial | partial | yes | partial | Review-first/deploy planning is real, but target-specific end-to-end deploy proof still varies by environment. |
| Runs inspector | yes | yes | yes | yes | yes | yes | yes | real | Mounted through canonical shell and backed by real run state. |
| Receipt inspector / open receipt | yes | yes | yes | yes | yes | yes | yes | real | Receipt actions resolve canonical proof instead of guessed state. |
| Recovery card / recovery actions | yes | yes | yes | yes | yes | yes | yes | real | Resume/rerun/open-receipt paths are customer-visible and regression-tested. |
| Capability install / retry flow | yes | yes | yes | yes | partial | yes | yes | partial | Real install state and retry path exist, but this surface still depends on capability availability and billing state. |
| Billing / entitlement refresh in app | yes | yes | yes | yes | n/a | partial | partial | partial | Live host mismatch was fixed, but paid customer-seat smoke remains the real bar. |
| Update feed / download surface | yes | yes | yes | yes | n/a | yes | yes | real | First-party download/feed URLs are live on `rinawarptech.com`. |
| Marketplace / capabilities panel | yes | yes | yes | yes | n/a | partial | yes | partial | Shell is real and mounted, but “real” still depends on available packs and account state. |
| Memory surface | yes | partial | partial | partial | n/a | no | partial | partial | UI exists and has been modernized structurally, but long-term product behavior is still evolving. |
| Brain panel | yes | partial | partial | partial | n/a | no | partial | partial | Visible surface exists, but it should not be oversold beyond what is truly active. |
| Placeholder / future-only surfaces | no | no | no | no | no | no | n/a | real by absence | The correct production posture is hidden or disabled, not fake-working UI. |

## Reality Gaps To Watch

These are the main categories that can make a feature look more real than it is:

- success or completion language without proof
- packaged behavior drifting from dev behavior
- capability or billing state that is only partially validated on a live customer seat
- visible surfaces whose structure is real, but whose product semantics are still evolving

## Rules For Updating This File

Only mark a feature `real` if all of these are true:

1. The customer can find the entry point in the shipped app.
2. The action reaches a real owner/handler.
3. The result is not guessed, stubbed, or silently degraded.
4. If the feature executes work, it has a real run/receipt or an explicit failure state.
5. The packaged app behavior has been validated directly or through a release gate.
6. There is a regression test or release checklist step that would catch it breaking again.

If any of those are false, the feature should stay `partial` or `not real`.
