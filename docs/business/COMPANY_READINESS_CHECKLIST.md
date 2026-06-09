# RinaWarp Company Readiness Checklist

Status reviewed: 2026-05-23

Purpose: this document is the single operational checklist for turning RinaWarp from a working beta application into a real, functioning software company.

Use this as the source of truth.

The goal is not perfection. The goal is:

> A stable, trustworthy AI product that developers can install, use repeatedly, pay for, and recommend.

Status key:

- `[x]` Repo evidence, docs, scripts, or prior validation show this is complete enough to count.
- `[ ]` Still needs live customer evidence, production proof, signing, or repeated operating cadence.

Related validation plan:

- [NOW_COMPANY_EXECUTION_PLAN.md](./NOW_COMPANY_EXECUTION_PLAN.md)
- [REAL_BUSINESS_VALIDATION_PLAN.md](./REAL_BUSINESS_VALIDATION_PLAN.md)

## Readiness Summary

- Product foundation: mostly in place, with crash/live recovery confidence still needing proof.
- Cloud, billing, release, support, and metrics machinery: substantially in place.
- AI capability: recovery workflows are real; broader project-understanding intelligence is the main v1.5.0-beta gap.
- Company readiness: operating docs exist, but real-world cadence, customer data, and outside-the-repo administration still need execution.

## 1. Product Foundation Checklist

### Desktop Application

- [x] Desktop app installs cleanly on supported launch platforms.
  - Evidence: `docs/BUSINESS_LAUNCH_AUDIT.md` records clean Debian and Windows 11 public-origin validation.
- [x] First launch is stable and understandable.
  - Evidence: `docs/FIRST_RUN_QA_CHECKLIST.md` defines the first-run pass bar.
- [x] Core terminal experience works without requiring AI.
  - Evidence: `apps/terminal-pro` ships Electron, xterm, node-pty, and terminal input surfaces.
- [x] App state survives relaunch.
  - Evidence: `docs/RINA_COMPLETION_CHECKLIST.md` marks store-backed run-to-message restore/hydration linkage complete.
- [x] Update path is documented and tested enough for beta.
  - Evidence: release metadata, checksums, update feeds, and release commands are documented in the release docs and package scripts.
- [ ] Crash reporting and incident review are fully proven in live operation.
  - Needed: repeated production crash/support review evidence.

### Rina Agent Core

- [x] Rina is the primary product experience.
  - Evidence: first-run and Agent Thread docs center the Agent/Ask Rina surface.
- [x] Rina can diagnose common developer workflow problems.
  - Evidence: disk, port, failed-build, and doctor flows exist in `apps/terminal-pro/src`.
- [x] Rina explains actions before taking meaningful risk.
  - Evidence: plan-risk tests and approval-gated workflow logic exist.
- [x] Rina uses the terminal transparently.
  - Evidence: trusted run, receipt, terminal command, and proof surfaces exist.
- [x] Rina produces useful summaries after actions complete.
  - Evidence: recovery summaries, fix blocks, and command reply renderers exist.
- [x] Rina preserves enough evidence for users to trust what happened.
  - Evidence: proof-backed run blocks and thread-level trust snapshots are marked complete in `docs/RINA_COMPLETION_CHECKLIST.md`.

### Current Workflows

#### Disk Recovery

- [x] Detects low disk space or disk-related failure states.
  - Evidence: `@rinawarp/doctor`, disk diagnostic IPC, and disk recovery routing exist.
- [x] Explains what is safe to clean.
  - Evidence: `docs/V1_2_1_BETA_SAFE_RECOVERY_BRIEF.md` defines safe cleanup explanation requirements.
- [x] Avoids destructive cleanup without explicit user approval.
  - Evidence: disk action plans are approval-gated and covered by renderer agent core tests.
- [x] Produces a clear recovery result.
  - Evidence: disk recovery evidence contract and recovery result UI exist.

#### Port Conflict Recovery

- [x] Detects when a required port is already in use.
  - Evidence: `fixProjectFlow` classifies `port-conflict` issues.
- [x] Identifies the conflicting process when possible.
  - Evidence: port conflict flow includes process-oriented diagnostic output.
- [x] Offers safe resolution options.
  - Evidence: fix blocks and run-intelligence UI present recovery options.
- [x] Confirms the app can run after recovery.
  - Evidence: project fix flow includes validation/retry behavior.

#### Failed Build Recovery

- [x] Detects build failure from command output.
  - Evidence: failed-build planning and fix-project flow exist.
- [x] Summarizes the likely cause in plain language.
  - Evidence: error explainer, fix blocks, and run-intelligence summaries exist.
- [x] Suggests the safest next command or fix.
  - Evidence: failed-build recovery is modeled as inspect, diagnostic, then approval-gated fix.
- [x] Can retry after a fix and report the outcome.
  - Evidence: fix-project flow and trusted run surfaces support retry/report behavior.

## 2. Cloud Infrastructure Checklist

### Rina Cloud API

- [x] Production API health checks exist.
  - Evidence: `npm run kpi:snapshot`, `npm run smoke:prod`, and `npm run smoke:stripe`.
- [x] Entitlement and account endpoints exist.
  - Evidence: billing, restore, portal, and entitlement routes are documented in `docs/LIVE_REVENUE_RUNBOOK.md`.
- [x] Desktop app can reach production services.
  - Evidence: license client and Rina Cloud client include production checkout, portal, and entitlement calls.
- [x] API failure states degrade gracefully in the app.
  - Evidence: license/account UI includes fallback and user-safe error states.
- [x] Logs are sufficient to debug support cases.
  - Evidence: support bundle, metrics, and revenue runbooks exist.

### Security

- [x] Secrets are stored outside git.
  - Evidence: company operating docs explicitly keep secrets, banking, tax, and private records outside the repo.
- [x] Production admin routes are protected.
  - Evidence: deployment docs call out production secrets and auth boundaries.
- [x] Billing, entitlement, and support data handling is documented.
  - Evidence: revenue runbook, support workflow, and operating model define supportable handling.
- [x] Authentication and authorization boundaries are documented.
  - Evidence: website deployment and product operating docs define auth/entitlement surfaces.
- [x] Security-sensitive workflows avoid unapproved destructive actions.
  - Evidence: safety policies block dangerous disk commands and approval-gate mutations.

## 3. Billing and Revenue Checklist

### Billing System

- [x] Pricing page matches live Stripe checkout paths.
  - Evidence: `docs/COMPANY_STATUS_CHECKLIST.md` marks live pricing, checkout, restore, and portal paths in place.
- [x] Checkout route works in production smoke.
  - Evidence: `docs/LAUNCH_REVIEW_1.1.10_48H.md` records `npm run smoke:stripe` passing.
- [ ] One real installed-build checkout-to-unlock path is proven end to end.
  - Needed: real checkout, webhook, desktop entitlement refresh, relaunch persistence, portal, and restore proof.
- [ ] Webhooks write real customer entitlements correctly.
  - Needed: production customer-seat proof from Stripe webhook through desktop unlock.
- [x] Restore purchase path exists.
  - Evidence: account and license panels support billing-email restore.
- [x] Billing portal path exists.
  - Evidence: account and license panels expose portal opening; smoke docs mark portal route present.
- [x] Failed payment and cancellation states are understood.
  - Evidence: license runtime maps canceled, past due, and expired states to user-safe copy.

### Revenue Readiness

- [ ] A user can discover, buy, install, and activate without manual help.
  - Needed: full real customer or test-buyer proof across the complete path.
- [x] Paid value is clear in product copy.
  - Evidence: pricing, marketplace gating, and upgrade-boundary copy are covered in docs/tests.
- [x] Support can resolve "I paid but it did not unlock" cases.
  - Evidence: `docs/SUPPORT_INBOX_WORKFLOW.md` and `docs/LIVE_REVENUE_RUNBOOK.md`.
- [x] Conversion, checkout, activation, and support metrics are reviewable.
  - Evidence: `docs/METRICS_SCOREBOARD.md`, `npm run kpi:snapshot`, and `npm run report:revenue-daily`.
- [ ] Pricing decisions are based on observed customer behavior.
  - Needed: multi-day real conversion and support-friction review.

## 4. User Experience Checklist

### Rina-First Experience

- [x] The first screen makes Rina feel like the product.
  - Evidence: first-run QA and Agent Thread model center Ask Rina/Agent.
- [x] Users can ask useful project questions immediately.
  - Evidence: Ask Rina composer, selection Ask Rina, palette, and help prompts exist.
- [x] Terminal execution feels like Rina's tool, not the user's burden.
  - Evidence: trusted run and agent execution flow wrap terminal actions.
- [x] Main workflows are visible without overwhelming navigation.
  - Evidence: first-run QA and UI completion docs address Agent-first hierarchy.
- [x] Upgrade prompts appear only where paid value is relevant.
  - Evidence: `docs/RINA_COMPLETION_CHECKLIST.md` marks capability boundary upgrade prompts complete locally.

### Trust Experience

- [x] Users can see what Rina plans to do.
  - Evidence: plan replies and proof-first capability replies exist.
- [x] Users can see what Rina actually did.
  - Evidence: run receipts, execution traces, and command reply renderers exist.
- [x] Success language is backed by proof.
  - Evidence: `docs/RINA_COMPLETION_CHECKLIST.md` marks proof-guarded success language complete.
- [x] Failures are explained without blame or vagueness.
  - Evidence: error explainer and safe failure copy exist.
- [x] Risky actions require clear approval.
  - Evidence: plan-risk tests and approval-gated fix flows.

## 5. AI Capability Checklist

### Repo Understanding

- [ ] Rina can reliably answer "What does this project do?"
  - Needed: v1.5.0-beta project understanding workflow with tests.
- [ ] Rina can reliably answer "How do I run this app?"
  - Needed: repo script/framework discovery and response tests.
- [ ] Rina can reliably answer "Explain this architecture."
  - Needed: architecture summarization over real repo context.
- [x] Rina can find likely build scripts.
  - Evidence: build/test/deploy intent and package script planning exist.
- [x] Rina can help explain why tests or builds are failing.
  - Evidence: failed-build recovery and error-explainer flow exist.
- [ ] Rina consistently uses actual repo context instead of generic guesses for all project questions.
  - Needed: project-understanding acceptance tests and manual demo proof.

### Coding Assistance

- [x] Rina can identify the smallest safe change for a bug in local flows.
  - Evidence: fix-project flow and plan-risk behavior.
- [x] Rina can explain code before editing it.
  - Evidence: plan/explain/approval model.
- [x] Rina can run relevant tests after changes.
  - Evidence: test intent, build/test scripts, and trusted run path exist.
- [x] Rina can summarize changed files and verification results.
  - Evidence: run summaries and proof surfaces.
- [x] Rina avoids broad refactors unless explicitly requested.
  - Evidence: local planning and safety rules emphasize smallest safe action.

## 6. Testing Checklist

### Automated Testing

- [x] Unit tests cover critical product logic.
  - Evidence: terminal-pro unit/agent/CLI tests plus package tests exist.
- [x] Integration tests cover API and entitlement flows.
  - Evidence: `packages/rinawarp-agentd/test/server-api.test.mjs` and `license-resolution.test.mjs`.
- [x] E2E tests cover the main desktop user loop.
  - Evidence: `npm run e2e:smoke` and terminal-pro Playwright config.
- [x] Billing smoke tests run against production-safe paths.
  - Evidence: `npm run smoke:stripe`.
- [x] Release smoke tests are documented and repeatable.
  - Evidence: `npm run smoke:prod`, `npm run audit:prod`, and release runbooks.

### Manual Product Tests

#### Core User Loop

- [x] Install app from public download surface.
  - Evidence: clean Debian and Windows public-origin validation in `docs/BUSINESS_LAUNCH_AUDIT.md`.
- [x] Launch app cleanly.
  - Evidence: same public-origin validation plus first-run QA.
- [x] Ask Rina a project question.
  - Evidence: first-run QA includes Ask Rina prompts.
- [x] Let Rina run a safe terminal command.
  - Evidence: trusted run and read-only diagnostic flows exist.
- [x] Review the explanation and proof.
  - Evidence: proof-backed run blocks and trust snapshot.
- [x] Relaunch and confirm state persists.
  - Evidence: store-backed restore/hydration proof marked complete.

#### Main Demo Flows

- [x] Disk recovery demo works at beta scope.
  - Evidence: safe disk recovery brief, disk diagnostic IPC, and planner tests.
- [x] Port conflict recovery demo works at beta scope.
  - Evidence: fix-project flow classifies and handles port conflicts.
- [x] Failed build recovery demo works at beta scope.
  - Evidence: fix-project flow and failed-build planning.
- [ ] Project understanding demo works at v1.5.0-beta scope.
  - Needed: "Ask Rina about this project" feature and acceptance proof.
- [ ] Paid upgrade or entitlement demo works end to end with a real installed build.
  - Needed: real checkout-to-unlock proof.

## 7. Deployment Checklist

### Production Deployment

- [x] Website deploy path is reliable.
  - Evidence: `npm run deploy:pages` and deploy runbooks.
- [x] Cloud API deploy path is reliable enough for beta.
  - Evidence: Wrangler/deploy scripts and Cloudflare runbooks exist.
- [x] Desktop release path is reliable enough for beta.
  - Evidence: `npm run release:desktop`, `release:publish:desktop`, and release docs.
- [x] Release artifacts are published with checksums.
  - Evidence: release metadata, SHASUMS, and audit scripts.
- [x] Production smoke tests pass after deploy.
  - Evidence: launch review records `smoke:prod`, `audit:prod`, and `smoke:stripe` passing.
- [x] Rollback or hotfix path is understood.
  - Evidence: release sequence, handoff, and post-release operations docs.

## 8. Business Checklist

### Company Operations

- [ ] Company records are organized outside git.
  - Needed: outside-the-repo confirmation.
- [ ] Banking and accounting are configured.
  - Needed: outside-the-repo confirmation.
- [ ] Tax handling is understood.
  - Needed: outside-the-repo confirmation.
- [x] Support inbox process is documented.
  - Evidence: `docs/SUPPORT_INBOX_WORKFLOW.md`.
- [ ] Support inbox is monitored on a proven schedule.
  - Needed: at least one full launch week of operating evidence.
- [x] Customer issues have a path back into the product backlog.
  - Evidence: support workflow and company operating cadence.
- [ ] Weekly metrics review is happening repeatedly.
  - Needed: several dated KPI/revenue review records.

### Go-To-Market

- [x] Product positioning is focused.
  - Evidence: strategy, GTM, brand, and operating docs center trust/proof/recovery.
- [x] Website explains the product truthfully.
  - Evidence: business launch audit marks messaging mostly aligned.
- [x] Demo flow shows the core value quickly.
  - Evidence: recovery demo docs and first-run QA.
- [ ] One repeatable acquisition channel is active.
  - Needed: dated GTM execution evidence.
- [ ] Follow-up cadence exists for interested users.
  - Needed: real outreach/follow-up process evidence.
- [ ] Testimonials, feedback, or customer evidence are collected responsibly.
  - Needed: actual customer evidence process and records outside sensitive data.

## 9. What Rina Is

### Final Product Definition

Rina is:

> An AI software engineer that safely diagnoses, explains, and fixes developer workflow problems through natural language while using the terminal transparently.

The terminal is not the product. The AI agent is the product. The terminal is the execution engine.

## 10. Immediate Next Priorities

### Right Now: v1.4.3-beta

- [x] Stabilize the current desktop beta.
  - Evidence: repo is now at `1.5.0-beta`; v1.4.3-beta stabilization is superseded by the current beta line.
- [x] Verify the current recovery workflows at local/beta scope.
  - Evidence: disk, port, and failed-build recovery flows exist with tests/docs.
- [ ] Confirm production billing and entitlement paths end to end with a real installed build.
  - Needed: real checkout-to-unlock proof.
- [x] Polish the Rina-first user experience.
  - Evidence: first-run QA and UI polish docs.
- [x] Keep release, support, and metrics checks repeatable.
  - Evidence: npm scripts and operating runbooks.

### Next: v1.5.0-beta

Build:

> Ask Rina about this project.

Prompts:

- [ ] What does this project do?
- [ ] How do I run this app?
- [ ] Explain this architecture.
- [x] Where is the build script?
  - Evidence: build/test/deploy intent and package script discovery exist.
- [x] Why are tests failing?
  - Evidence: failed-build/test failure explanation and recovery flows exist.

This is the next major step toward Warp/Cursor-style intelligence.

## 11. Final Reality Check

You do not need:

- millions of users
- perfect AI
- infinite workflows
- ChatGPT-scale popularity

You do need:

- a trustworthy product
- repeat usage
- paying customers
- reliable infrastructure
- focused positioning

That is what builds a real software company.

## Remaining Company-Critical Gaps

1. Deploy production Rina Cloud for the `v1.4.3-beta` milestone.
2. Prove one real checkout-to-desktop-unlock path end to end.
3. Finish the `Ask Rina about this project` repo-understanding workflow for `v1.5.0-beta`.
4. Use Rina daily and turn repeated dogfood friction into roadmap work.
5. Observe 5 real developers using Rina on real problems.
6. Capture repeated weekly metrics, support, and GTM operating evidence.
7. Confirm outside-the-repo banking, accounting, tax, and company records.
8. Decide when Windows signing and macOS signing/notarization matter for the next public release.
9. Run the 10 critical stranger-user tests in [REAL_BUSINESS_VALIDATION_PLAN.md](./REAL_BUSINESS_VALIDATION_PLAN.md).

## Evidence Commands

Run these when preparing a release or company-readiness review:

```bash
git checkout main
pnpm install
pnpm build
pnpm dist:desktop
npm run verify:prelaunch:full
npm run smoke:prod
npm run audit:prod
npm run smoke:stripe
npm run kpi:snapshot
npm run report:revenue-daily
npm run test
npm run e2e:smoke
```

## Covered Areas

This checklist covers:

- Product readiness
- AI agent architecture
- Cloud infrastructure
- Billing and subscriptions
- Security
- Testing
- Deployment
- UX polish
- Business setup
- Revenue readiness
- Next milestones

This is the single source of truth for making sure RinaWarp becomes a real functioning company and not just a collection of experiments.
