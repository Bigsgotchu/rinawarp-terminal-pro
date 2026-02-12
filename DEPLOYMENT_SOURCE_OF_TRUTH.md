# Deployment Source Of Truth

This repository has one production deployment path for `www.rinawarptech.com`.

## Canonical Rules

1. Production branch: `master`
2. Deploy platform: Cloudflare Pages
3. Canonical Pages project: `rinawarptech-website`
4. Canonical site output directory: `rinawarptech-website/web`
5. Canonical deploy command: `npm run deploy:pages` (uses `scripts/deploy-pages-prod.sh`)
6. Canonical smoke checks after deploy:
   - `npm run smoke:pages`
   - `npm run smoke:prod`
   - `npm run audit:prod`

## Workflow Scope Rule

Only root workflows under `.github/workflows/` are active for this repository.

Workflows located under nested paths such as:
- `rinawarp-terminal-pro/.github/workflows/`

are not active for this repository and must not be used as deployment authority.

## Redirect/Header Rule

Cloudflare Pages only applies `_redirects` and `_headers` from the published output directory.

Canonical files:
- `rinawarptech-website/web/_redirects`
- `rinawarptech-website/web/_headers`

Any duplicate `_redirects` / `_headers` outside that output directory are non-authoritative.

## Change Control

Before merging deploy-impacting changes:

1. Verify paths/configs match the rules above.
2. Run route and smoke checks.
3. Confirm `/_build.txt` matches between:
   - `https://rinawarptech-website.pages.dev`
   - `https://www.rinawarptech.com`

If these fingerprints differ, fix domain/project binding first, not content files.
