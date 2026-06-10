# Secret Rotation Checklist - 2026-06-08 AppImage Environment Exposure

## Context

An unsanitized AppImage launch printed API-related environment variable names and values to local command output. Treat those values as exposed even if the logs were local.

Do not copy secret values into this file, chat, tickets, commits, screenshots, or reports.

## Providers To Review

Known providers exposed by API-related environment variables:

- [ ] OpenAI
- [ ] Anthropic
- [ ] Groq

Also review any other credentials that were present in the launch environment or configured for this repo/deployment, especially:

- [ ] Stripe
- [ ] SendGrid
- [ ] GitHub tokens
- [ ] Cloudflare tokens
- [ ] database URLs or service credentials
- [ ] session, JWT, or encryption secrets

Track provider rotation status without recording secret values:

| Provider | Credential purpose | Rotated in provider dashboard | Local secret updated | Deployment secret updated | Old key revoked | Health verified |
| --- | --- | --- | --- | --- | --- | --- |
| OpenAI | API access | [ ] | [ ] | [ ] | [ ] | [ ] |
| Anthropic | API access | [ ] | [ ] | [ ] | [ ] | [ ] |
| Groq | API access | [ ] | [ ] | [ ] | [ ] | [ ] |
| Stripe | Billing, checkout, webhook | [ ] | [ ] | [ ] | [ ] | [ ] |
| SendGrid | Email delivery | [ ] | [ ] | [ ] | [ ] | [ ] |
| GitHub | Release, repo, or automation access | [ ] | [ ] | [ ] | [ ] | [ ] |
| Cloudflare | Pages, Workers, D1, or API access | [ ] | [ ] | [ ] | [ ] | [ ] |
| Database or session secrets | Runtime auth/data access | [ ] | [ ] | [ ] | [ ] | [ ] |

## Manual Rotation Steps

- [ ] Identify every exposed or possibly exposed environment variable by provider and purpose.
- [ ] Rotate the affected API keys/tokens in each provider dashboard.
- [ ] Update local `.env` files or local secret manager entries with the new values.
- [ ] Update deployment environment variables for affected services.
- [ ] Confirm deployment targets updated, as applicable:
  - [ ] Cloudflare Workers or Pages secrets
  - [ ] GitHub Actions repository or environment secrets
  - [ ] Stripe webhook signing secret
  - [ ] local founder/demo launch environment
- [ ] Restart or redeploy affected services so new values are active.
- [ ] Verify production health after rotation:
  - [ ] `npm run smoke:prod`
  - [ ] `npm run audit:prod`
  - [ ] `npm run smoke:stripe`
  - [ ] `npm run verify:downloads`
- [ ] Revoke or delete old keys after new keys are confirmed active.
- [ ] Where safely possible, confirm old keys no longer work.
- [ ] Confirm no rotated secret values were committed, logged, pasted, or added to documentation.
- [ ] Record only pass/fail, provider names, timestamps, and evidence paths. Do not record token prefixes or secret values.

## Notes

- The founder visual demo launcher now unsets common API, Stripe, SendGrid, and debug environment variables before launching the AppImage.
- Do not push release or beta-verification commits until the exposed keys have been rotated and affected services are healthy.
- Full paid beta signoff still requires the purchase, entitlement, desktop unlock, persistence, restore, and billing portal loop.
