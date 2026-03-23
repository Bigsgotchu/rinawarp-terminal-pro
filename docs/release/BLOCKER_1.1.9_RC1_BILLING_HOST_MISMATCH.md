# 1.1.9 RC1 Blocker: Billing Host Mismatch

## Summary

`v1.1.9-rc1` shipped with a revenue-blocking billing host mismatch in the desktop app.

The desktop license client defaulted checkout and portal requests to `https://api.rinawarptech.com`, but the live Stripe checkout and portal routes were only available on the website hosts:

- `https://www.rinawarptech.com`
- `https://rinawarptech.com`

That meant a fresh desktop user could hit a broken purchase path even though the public website billing flow was healthy.

## Customer Impact

- Checkout from the desktop app could fail before opening Stripe.
- Customer portal launch from the desktop app could fall back or fail against the wrong host.
- This was a release blocker because it breaks the revenue path from installed app to paid unlock.

## Root Cause

The desktop billing client assumed one host served all billing and license endpoints:

- verify
- checkout
- portal
- lookup

In production, those routes are currently split across hosts.

## Minimal Fix

Updated the desktop license client to try the configured billing hosts in order instead of assuming a single base URL:

- `https://api.rinawarptech.com`
- `https://www.rinawarptech.com`
- `https://rinawarptech.com`

Implementation:

- [client.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/license/client.ts)

This keeps existing verification behavior intact while allowing checkout and portal to fall through to the working website hosts.

## Verification

Automated verification after the fix:

- `bash scripts/smoke-stripe.sh https://www.rinawarptech.com https://www.rinawarptech.com`
- `npm run verify:desktop:rc`

Observed live behavior:

- `https://api.rinawarptech.com/api/checkout` returned `404`
- `https://api.rinawarptech.com/api/portal` returned `404`
- website-host billing smoke passed on `https://www.rinawarptech.com`

## Release Decision

Do not promote `v1.1.9-rc1` directly.

Promote from the blocker-fix commit instead:

- either tag `v1.1.9-rc2`
- or cut final `v1.1.9` from the verified blocker-fix commit

No additional non-blocker changes should be bundled with this follow-up.
