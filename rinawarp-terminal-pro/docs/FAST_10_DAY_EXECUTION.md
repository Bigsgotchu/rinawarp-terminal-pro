# RinaWarp 10-Day Strike Plan (Repo-Executable)

Goal: close the biggest competitive gaps in 10 days with existing scripts and minimum new surface area.

Operating mode:
- Ship daily.
- If a task takes more than 4 hours, cut scope.
- Every day ends with a measurable production check.

## Day 1 - Trust Baseline

Hour 1-2:
- Freeze release baseline and verify current health.
- Commands:
```bash
npm run smoke:prod
npm run smoke:stripe
npm run verify:downloads
npm run audit:prod
```

Hour 3-4:
- Confirm security and policy docs are complete and linked from website.
- Files to update:
- `web/security.html`
- `web/data-boundary.html`
- `web/index.html`
- `web/download.html`

Hour 5-6:
- Add explicit "how to verify download" flow and support contact in download/support pages.
- Commands:
```bash
npm run verify:site
npm run verify:branding
```

Hour 7-8:
- Deploy and validate.
- Commands:
```bash
npm run deploy:pages
npm run smoke:prod
```

Exit criteria:
- Security/trust pages live.
- Download verification links resolve and are correct.

## Day 2 - Signing + Release Hardening

Hour 1-2:
- Validate signing pipeline and key material.
- Commands:
```bash
bash deploy/verify-signing.sh
bash deploy/verify-release-signatures.sh
```

Hour 3-5:
- Ensure release checklist and docs match current pipeline.
- Files:
- `deploy/RELEASE_CHECKLIST.md`
- `deploy/launch-readiness.md`

Hour 6-8:
- Dry-run release pipeline.
- Commands:
```bash
SKIP_BUILD=1 DRY_RUN=1 AUTO_COMMIT=0 npm run release:desktop
```

Exit criteria:
- No release-step ambiguity.
- Sign/verify flow passes in dry-run.

## Day 3 - Auto-Update MVP (Desktop)

Hour 1-2:
- Add simple update check service in app startup.
- Files (likely):
- `apps/terminal-pro/src/main.ts`
- `apps/terminal-pro/src/preload.ts`
- `apps/terminal-pro/src/renderer/`

Hour 3-5:
- Add UI prompt: update available -> download/restart guidance.

Hour 6-7:
- Add telemetry events for update-check and update-accept.
- Files:
- `web/assets/analytics.js`
- app event emit points in renderer/main.

Hour 8:
- Build and smoke.
- Commands:
```bash
npm --workspace apps/terminal-pro run build:electron
npm --workspace apps/terminal-pro run lint
```

Exit criteria:
- Users can detect and act on updates without docs.

## Day 4 - 2-Minute Activation Flow

Hour 1-3:
- Build first-run guided flow with 3 tasks:
- "run safe command"
- "run plan + approval"
- "download report"

Hour 4-6:
- Add explicit success marker and "time to first success" telemetry.

Hour 7-8:
- E2E smoke for activation path.
- Commands:
```bash
npm --workspace apps/terminal-pro run e2e:smoke
```

Exit criteria:
- New user reaches first success in under 2 minutes.

## Day 5 - Integrations (GitHub + Slack Lite)

Hour 1-2:
- Define minimal integration contracts and secrets handling.

Hour 3-6:
- Ship GitHub + Slack basic actions only.
- No complex OAuth UX polish.

Hour 7-8:
- Add diagnostics and failure messages.
- Commands:
```bash
npm run scan:app
npm --workspace apps/terminal-pro run lint
```

Exit criteria:
- Both integrations complete one useful action end-to-end.

## Day 6 - Team/Admin Lite

Hour 1-3:
- Add org seat basics (invite/remove) and role split (`owner`/`member`).

Hour 4-6:
- Add audit export from account/settings.
- Files likely:
- `web/account/index.html`
- `stripe-webhook-worker/src/index.ts`
- `downloads-worker/src/index.ts` (if auth scopes needed)

Hour 7-8:
- Add tests/smoke for role boundaries.

Exit criteria:
- Team owner can manage seats and export logs.

## Day 7 - Reliability + SLA Surface

Hour 1-2:
- Set production monitors and status page links.

Hour 3-5:
- Add top crash/error telemetry dashboards.
- Commands:
```bash
npm run watchdog:prod:once
npm run kpi:snapshot
npm run revenue:diagnose
```

Hour 6-8:
- Publish reliability section on website/pricing.
- Files:
- `web/pricing.html`
- `web/security.html`

Exit criteria:
- Public reliability story and active monitoring in place.

## Day 8 - Positioning + Conversion Rewrite

Hour 1-3:
- Rewrite hero/pricing copy around one painful workflow.
- Files:
- `web/index.html`
- `web/pricing.html`
- `web/features.html`

Hour 4-6:
- Add comparison table and quantified outcomes.

Hour 7-8:
- Verify funnel events still fire.
- Commands:
```bash
npm run smoke:web
npm run smoke:stripe
```

Exit criteria:
- Clear differentiation visible above the fold.

## Day 9 - Funnel + Recovery

Hour 1-3:
- Tighten login/signup/account fallbacks and error paths.
- Files:
- `web/assets/login.js`
- `web/assets/signup.js`
- `web/account/index.html`

Hour 4-6:
- Add abandon/failed-auth recovery prompts.

Hour 7-8:
- Revenue flow smoke.
- Commands:
```bash
npm run e2e:revenue
npm run audit:stripe-success
```

Exit criteria:
- Checkout to download path has no blind spots.

## Day 10 - Launch + Release

Hour 1:
- Bump version.
- Command:
```bash
bash deploy/bump-release-version.sh 1.0.3
```

Hour 2-4:
- Build/release/sign/upload.
- Command:
```bash
npm_config_ignore_scripts=true npm run release:desktop
```

Hour 5:
- Deploy pages.
- Command:
```bash
npm run deploy:pages
```

Hour 6-7:
- Full production validation.
- Commands:
```bash
npm run smoke:prod
npm run smoke:stripe
npm run audit:prod
npm run kpi:snapshot
```

Hour 8:
- Publish release notes + outreach.
- Files:
- `docs/REVENUE_OPERATIONS.md`
- `docs/TODAY_GTM_CHECKLIST.md`

Exit criteria:
- New version live.
- Funnel, reliability, and download integrity all green.

---

## Daily Hard Gate (Run Every Evening)

```bash
npm run verify:downloads
npm run smoke:prod
npm run smoke:stripe
npm run audit:prod
```

If any fail, no new feature work until green.

## Fast-Fail Scope Rules

- Do not add net-new platforms during this sprint.
- Do not add more than two integrations.
- Do not implement complex RBAC; keep `owner/member`.
- Do not postpone release tests to "later."

## Known Release Pitfalls To Avoid

- After version bump, update all hardcoded download/version references:
- `web/download.html`
- `rinawarptech-website/web/download.html`
- `web/account/index.html`
- `rinawarptech-website/web/account/index.html`

- Ensure downloads worker release version matches current release:
- `downloads-worker/wrangler.toml` -> `RELEASE_VERSION`

- Always deploy pages after release metadata changes:
```bash
npm run deploy:pages
```
