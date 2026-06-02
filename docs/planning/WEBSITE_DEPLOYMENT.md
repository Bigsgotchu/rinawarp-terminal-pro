# Website Deployment

`rinawarptech.com` is hosted on the Cloudflare Pages/Workers path in this repo.

## Canonical Production Path

Use this command for the public website:

```bash
npm run deploy:pages
```

That command:

- builds the Pages worker bundle into `website/.pages-dist`
- publishes it with `wrangler pages deploy`
- runs the production smoke check afterward
- blocks a production deploy if the current Terminal Pro version does not have a coherent release bundle behind `/releases/*`

Primary implementation:

- [`package.json`](../package.json)
- [`scripts/deploy/deploy-pages-prod.sh`](../scripts/deploy/deploy-pages-prod.sh)
- [`website/workers/router.ts`](../website/workers/router.ts)

## Required Tooling

Required for the website deploy path:

- Node.js
- npm
- Wrangler / Cloudflare auth
- Matter Intelligence Stripe env vars when launching the second product:
  - `STRIPE_MI_SOLO_PRICE_ID`
  - `STRIPE_MI_TEAM_PRICE_ID`
  - `STRIPE_MI_ENTERPRISE_PRICE_ID`
- `AUTH_SECRET` for `/api/me/entitlements` and `/api/auth/desktop-session`

Not required for the website deploy path:

- Vercel CLI
- `vercel.json`
- `.vercel/project.json`

## Verification

After deploy, verify:

```bash
npm run smoke:prod
```

That smoke now proves both:

- Terminal Pro download/update surfaces
- product-family pages such as `/products` and `/matter-intelligence/*`

This is already triggered by `npm run deploy:pages` for the production project/branch path, but it is still the canonical follow-up verification command.

## Continuous Production Monitoring

Production smoke checks now run continuously in GitHub Actions:

- workflow: `.github/workflows/prod-smoke-monitor.yml`
- cadence: every 10 minutes
- trigger: schedule and manual `workflow_dispatch`
- behavior: one automatic retry before failing (to reduce transient CDN/network false positives)
- outputs: uploaded `smoke-prod.log` artifact and step summary

Manual run examples:

1. Default target (`https://www.rinawarptech.com`) from Actions UI: run `Prod Smoke Monitor`.
2. Custom target (for troubleshooting):

```text
workflow_dispatch input: site_base=https://rinawarptech.com
```

## Release Safety Guard

For the production Pages path, `deploy:pages` now verifies that the current Terminal Pro version has a coherent local release bundle before deploy:

- AppImage, `.deb`, and `.exe` artifacts exist for the current version
- `SHASUMS256.txt` matches those exact files
- `latest.json`, `latest.yml`, and `latest-linux.yml` point at the same version

This prevents the website from advertising a new desktop version before the release artifacts are actually ready.

### Verification Modes

`scripts/deploy/deploy-pages-prod.sh` supports explicit download verification modes:

- `RINAWARP_DOWNLOAD_VERIFY_MODE=strict`
  Enforce `verify-download-links.mjs` and fail deploy on mismatch.
- `RINAWARP_DOWNLOAD_VERIFY_MODE=warn`
  Run verification but continue deploy with a warning on failure.
- `RINAWARP_DOWNLOAD_VERIFY_MODE=off`
  Skip verification entirely.

Default behavior:

- production (`rinawarptech-website` on `master`): `strict`
- non-production branches/projects: `warn`

Legacy compatibility:

- `RINAWARP_SKIP_DOWNLOAD_VERIFICATION=1` maps to `off`

## Vercel Boundary

This repo still contains Vercel support in a few places, but it is optional:

- provider capability proofs
- Terminal Pro deployment-target demos
- preview/provider comparison experiments

Those flows do not make Vercel part of the required `rinawarptech.com` hosting stack.
