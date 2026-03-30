# RinaWarp Companion Post-Publish Smoke Test

Date: 2026-03-30

Use this after a Marketplace publish to confirm the public build still feels trustworthy.

## Scope

This is the shortest high-signal trust pass for the shipped Marketplace build.

Run it from a clean or mostly clean VS Code profile using the Marketplace-installed extension.

## Install

1. Install or update the pre-release from Marketplace.
2. Reload VS Code.
3. Confirm the installed extension version matches the published build.

Expected result:

- the extension installs from Marketplace without needing a local VSIX fallback
- the activity bar icon renders correctly
- the `Companion` and `Chat` views both appear under `RinaWarp`

## First-Run Experience

1. Open `Companion`.
2. Confirm the first-run onboarding items are visible.
3. Open `Chat`.
4. Confirm the empty state explains what to do first.

Expected result:

- the sidebar shows a clear `Start Here` action
- the chat view explains the connect and first-value path cleanly
- the UI feels branded and intentional, not placeholder-heavy

## Core Trust Loop

1. Run `RinaWarp: Connect Account`.
2. Complete login in the browser.
3. Use `Return to VS Code` if the browser does not auto-switch.
4. Run `RinaWarp: Refresh Entitlements`.
5. Run `RinaWarp: Run Free Diagnostic`.

Expected result:

- callback returns to the extension
- entitlements refresh succeeds or fails honestly with recovery guidance
- diagnostic output feels specific to the workspace

## Chat Loop

1. Open `Chat`.
2. Ask `What should I do first in this workspace?`
3. Click one suggested action.

Expected result:

- the chat view responds without looking broken
- action buttons invoke the expected Companion commands
- the answer feels grounded in the current workspace or product state

## Commercial Loop

1. Run `RinaWarp: Open Packs`.
2. Run `RinaWarp: Upgrade to Pro`.
3. Run `RinaWarp: Open Billing Portal`.
4. Run `RinaWarp: Verify Purchase Return`.

Expected result:

- pack, pricing, and billing routes open the right live pages
- the purchase-return verification page still returns to VS Code
- the extension shows an honest next step after the callback

## Record

Mark each section:

- `Pass`
- `Needs work`
- `Not tested`

Capture:

- screenshots for visual regressions
- exact notification copy for trust or recovery problems
- `RinaWarp Companion` output logs for broken callbacks, refreshes, or chat failures
