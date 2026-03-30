# RinaWarp Companion Manual Verification Runbook

Date: 2026-03-29

Use this runbook to complete the remaining `PRE_RELEASE_GO_NO_GO.md` checks that cannot be proven from repo inspection alone.

Canonical decision gate:

- [PRE_RELEASE_GO_NO_GO.md](/home/karina/Documents/rinawarp-terminal-pro/apps/rinawarp-companion/PRE_RELEASE_GO_NO_GO.md)

## Scope

This runbook is for the live checks that must be done in VS Code and the browser:

- local VSIX install
- first launch and UI sanity
- account connect return flow
- entitlement refresh behavior
- free diagnostic behavior
- pack, pricing, and billing handoff
- purchase return and recovery behavior

## Prerequisites

- a built extension:
  - `npm --workspace apps/rinawarp-companion run build`
- a VSIX artifact:
  - preferred: `npm --workspace apps/rinawarp-companion run package:vsix`
  - fallback: use the existing `apps/rinawarp-companion/rinawarp-companion.vsix`
- VS Code with a clean or mostly clean profile
- access to the intended live website and API surfaces
- at least one unpaid account and one paid account if possible

## Packaging Note

If `npm --workspace apps/rinawarp-companion run package:vsix` stalls in a shell, confirm that `vsce` is actually available in the current environment. In this repo the script shells out through `npx vsce`, so a missing local install or blocked package fetch can look like a product problem when it is really an environment issue.

## Linux Callback Note

If the browser return path opens a plain text `callback?...` tab in VS Code instead of updating Companion state, check the desktop URL handler for `x-scheme-handler/vscode`.

One confirmed failure mode on Linux was:

- system handler pointed to `code-url-handler.desktop`
- desktop entry used `Exec=/usr/share/code/code --open-url %U`
- that invocation failed locally with `/usr/share/code/code: bad option: --open-url`

The working user-level override on this machine was:

- `Exec=/usr/bin/code --open-url %U`

Verify with:

```bash
xdg-mime query default x-scheme-handler/vscode
```

## Suggested Test Workspace

Use a trusted workspace that has:

- a `package.json`
- either `package-lock.json` or `pnpm-lock.yaml`
- optionally Docker or CI files

That gives the free diagnostic enough signals to recommend a pack and produce a realistic summary.

## 1. Install and First Launch

1. Install the VSIX in VS Code.
2. Open the activity bar and confirm the `RinaWarp` icon is visible.
3. Open the `Companion` and `Chat` views.
4. Confirm the walkthrough renders with the expected images and copy.

Expected results:

- the extension installs without obvious warnings
- activation completes without visible errors
- the sidebar and chat view open
- icon and walkthrough media render correctly

If anything fails:

- open `View: Output`
- inspect the `RinaWarp Companion` output channel
- record the exact failure and whether it blocks activation or just degrades polish

## 2. Account Connect and Callback

1. Run `RinaWarp: Connect Account`.
2. Confirm the browser opens the intended login flow.
3. Complete login.
4. If the browser does not switch back automatically, click `Return to VS Code`.
5. Confirm the callback returns to `rinawarp.rinawarp-companion`.
6. Confirm VS Code shows the connected-plan notification.
7. Confirm the sidebar reflects the connected account state.

Expected results:

- browser opens the intended auth surface
- the callback returns into the extension
- the extension stores account state and shows the refreshed plan
- if the browser misses the auto-switch, the account page still offers a working `Return to VS Code` fallback

If the callback lands but refresh fails:

- reconnect first
- then run `RinaWarp: Refresh Entitlements`
- record whether the snapshot fallback still shows usable account context

## 3. Entitlement Refresh

1. Run `RinaWarp: Refresh Entitlements` after connect.
2. Confirm the refreshed plan appears in the notification.
3. Repeat with both a paid and unpaid account if possible.

Expected results:

- paid account reflects `pro` or `team` correctly
- unpaid account reflects `free` honestly
- failures are explicit and recoverable, not silent
- if the account was previously stale, reconnect first and then re-run refresh

## 4. Free Diagnostic

1. Open a trusted workspace.
2. Run `RinaWarp: Run Free Diagnostic`.
3. Confirm the output channel opens and the summary feels specific to the workspace.
4. Confirm the sidebar and chat surfaces update with the diagnostic state.
5. Use the call-to-action buttons from the diagnostic prompt.

Expected results:

- the command runs only in a trusted workspace
- the summary feels concrete rather than placeholder-only
- the recommended pack matches the workspace shape
- `Open Packs`, `View <pack>`, and `Upgrade to Pro` behave correctly

## 5. Restricted Mode

1. Open an untrusted workspace or Restricted Mode session.
2. Attempt `RinaWarp: Run Free Diagnostic`.
3. Try account, pricing, privacy, and pack-opening commands.

Expected results:

- diagnostic is blocked with an honest explanation
- browser-opening flows still work acceptably
- the experience feels limited, not broken or misleading

## 6. Pack, Pricing, and Billing Handoff

Run each command directly:

- `RinaWarp: Open Packs`
- `RinaWarp: Open Pack`
- `RinaWarp: Upgrade to Pro`
- `RinaWarp: Open Billing Portal`
- `RinaWarp: Open Privacy Details`

Expected results:

- `Open Packs` lands on `/agents`
- pack deep links land on the intended pack destination
- `Upgrade to Pro` lands on the intended pricing flow
- pricing includes a `return_to` callback for the extension
- billing and privacy routes open the intended live pages

## 7. Purchase Return and Recovery

Use the safe verification command before you try a real charge flow.

1. Run `RinaWarp: Verify Purchase Return`.
2. Confirm the browser opens the verification-only purchase success page.
3. Confirm the page is clearly labeled as a no-charge verification path.
4. Click `Return to VS Code` if the browser does not auto-switch.
5. Confirm the browser returns to `rinawarp.rinawarp-companion/purchase-complete`.
6. Confirm the extension either:
   - refreshes entitlements and shows the new plan, or
   - shows the recovery message telling the user to refresh manually

Expected results:

- purchase-return verification returns to the extension without requiring a real Stripe charge
- entitlement refresh succeeds or fails honestly
- the user is never left without a next step
- real checkout remains separate and unchanged

## 8. Evidence To Record

For each section above, record:

- `Pass`
- `Needs work`
- `Not tested`

Also capture:

- screenshots if UI is wrong
- exact URLs if routing is wrong
- exact notification copy if recovery messaging is confusing
- output channel logs for activation, diagnostic, or refresh issues

## Release Rule

Do not move the final gate from `No-Go` until:

- local VSIX install is proven
- account connect callback is proven
- entitlement refresh behavior is proven
- free diagnostic behavior is proven
- purchase return behavior is proven or has an honest fallback

Current note:

- after the account-page cleanup and callback fixes on `2026-03-30`, the safe purchase-return verification flow has been exercised successfully
- the billing portal path is now verified at the live API level because `/api/portal` returns a Stripe billing-session URL for the paid account email
- fresh local VSIX packaging has now been re-verified on the current build with `npm --workspace apps/rinawarp-companion run package:vsix`
