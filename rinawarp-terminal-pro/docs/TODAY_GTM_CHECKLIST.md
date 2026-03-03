# Today GTM Checklist (Revenue Focus)

## Goal

Get qualified traffic to `https://www.rinawarptech.com/pricing/` with trackable UTMs and create first real checkout attempts.

## 1) Generate Campaign Links

```bash
npm run marketing:utm
```

## 2) Publish 3 Assets Today

1. One short demo clip: "broken env -> safe fix -> proof log"
2. One written post with the same narrative
3. One direct community share where your ICP hangs out

## 3) Use This Message Pattern

- Problem: "AI explains, but doesn't safely fix real terminal issues."
- Promise: "RinaWarp diagnoses first, asks before execution, and logs every change."
- CTA: "Try free diagnostics, then upgrade for execution."

## 4) Distribution Targets (same day)

1. X post + thread
2. One relevant Reddit/community post
3. Existing email list/beta users
4. 10 direct DMs to ideal users (founders/devops/indie devs)

## 5) End-of-Day Check

```bash
npm run revenue:diagnose
npm run report:revenue-daily
```

Success criteria for day 1:

- `pricing_views > 0`
- `checkout_clicks > 0`
- at least one `pricing_checkout_redirect` event
