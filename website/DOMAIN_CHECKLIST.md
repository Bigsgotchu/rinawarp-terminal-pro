# Domain & SEO Checklist (`rinawarptech.com`)

## Canonical Host
- Canonical host: `rinawarptech.com` (apex)
- `www.rinawarptech.com` must `301` to `https://rinawarptech.com/$PATH?$QUERY`

## HTTPS
- Always serve HTTPS
- HTTP must `301` to HTTPS for both apex and `www`

## Canonical Tags
- Every page must include:
  - `<link rel="canonical" href="https://rinawarptech.com/<path>">`
- Canonical must match the final redirected URL and never use `www`

## SEO Titles
- Home:
  - `<title>RinaWarp Terminal Pro</title>`
- Inner pages:
  - `<title><Page Name> - RinaWarp Terminal Pro</title>`
- `og:title` and `twitter:title` should follow the same pattern

## Redirects
- `www` -> apex (`301`)
- Optional typo domains:
  - If `rinawrptech.com` is owned, `301` to `rinawarptech.com`

## Caching
- HTML: short TTL or Cloudflare Worker/Pages defaults
- Static assets (JS/CSS/images): long TTL plus `immutable`
- Download artifacts: long TTL plus `immutable`, preferably on a separate hostname

## Smoke Checks
Run before and after deploy:

```bash
curl -I https://www.rinawarptech.com/anything
curl -I https://rinawarptech.com/
curl -s https://rinawarptech.com/ | rg -n 'rel="canonical"|<title>|og:title|twitter:title'
```

Expected:
- `www` returns `301` to apex
- apex returns `200`
- home page includes the correct canonical URL and titles
- `robots.txt` and `sitemap.xml` are reachable if used

## Notes
- Keep redirect logic in `website/workers/router.ts`
- Keep title, Open Graph, and Twitter title logic in `website/workers/seo.ts`
