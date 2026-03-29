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
- [`scripts/deploy-pages-prod.sh`](../scripts/deploy-pages-prod.sh)
- [`website/workers/router.ts`](../website/workers/router.ts)

## Required Tooling

Required for the website deploy path:

- Node.js
- npm
- Wrangler / Cloudflare auth

Not required for the website deploy path:

- Vercel CLI
- `vercel.json`
- `.vercel/project.json`

## Verification

After deploy, verify:

```bash
npm run smoke:prod
```

This is already triggered by `npm run deploy:pages` for the production project/branch path, but it is still the canonical follow-up verification command.

## Release Safety Guard

For the production Pages path, `deploy:pages` now verifies that the current Terminal Pro version has a coherent local release bundle before deploy:

- AppImage, `.deb`, and `.exe` artifacts exist for the current version
- `SHASUMS256.txt` matches those exact files
- `latest.json`, `latest.yml`, and `latest-linux.yml` point at the same version

This prevents the website from advertising a new desktop version before the release artifacts are actually ready.

## Vercel Boundary

This repo still contains Vercel support in a few places, but it is optional:

- provider capability proofs
- Terminal Pro deployment-target demos
- preview/provider comparison experiments

Those flows do not make Vercel part of the required `rinawarptech.com` hosting stack.
