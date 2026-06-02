# VS Code Extension Revenue Plan

Date: 2026-03-27

This document turns the VS Code extension opportunity into a concrete execution plan for RinaWarp.

It is not a replacement for the desktop revenue path in [REVENUE_LAUNCH_PLAN.md](/home/karina/Documents/rinawarp-terminal-pro/docs/REVENUE_LAUNCH_PLAN.md). It is the extension-led growth plan that should begin once the website, billing, unlock, and first-run desktop path are trustworthy.

## One-Line Strategy

Use a free-to-install VS Code extension to create awareness and first value inside the editor, then convert users to paid RinaWarp accounts on `rinawarptech.com` through account linking and entitlement-based feature unlocks.

## Core Constraints

Design around these facts:

- VS Code Marketplace does not provide a native paid checkout flow for extensions.
- Marketplace pricing is label-only: `Free` or `Trial`.
- The extension should be free to install.
- Billing should stay on `rinawarptech.com`.
- The extension should check entitlements after sign-in.
- Upgrade prompts must appear at useful moments, not as constant interruption.
- This should be treated as a BYOL model: the right to use paid features is obtained outside the Marketplace.

## Product Shape

### Recommended portfolio

Start with one core extension:

- `RinaWarp Companion`

Add discovery satellites only after the core funnel is measurable:

- `RinaWarp Theme Pack`
- `RinaWarp Snippet Kit`
- `RinaWarp Extension Pack`

### Why this sequencing

The companion extension is the only part with a direct path to revenue because it can:

- connect a RinaWarp account
- expose pack discovery
- run proof-backed actions
- show Free versus Pro versus Team boundaries
- open upgrade and billing flows with attribution

Themes and snippets are useful, but they are discovery multipliers, not the main conversion engine.

## Extension Type Inventory

Use this inventory to keep scope decisions honest.

| Extension type | Time-to-value | Awareness | Direct conversion | RinaWarp fit |
| --- | --- | --- | --- | --- |
| SaaS-integrated tools | fast to medium | high | high | best near-term fit for account linking, pack execution, receipts, and upgrade flows |
| Themes | very fast | high | low to medium | strong discovery surface and brand expansion |
| Snippets | fast | medium | low to medium | useful for workflow templates and pack discovery |
| Linters / diagnostics | medium | medium | medium | promising if tied to proof-backed remediation |
| Language tools | medium to long | medium | medium | only worth it if RinaWarp adds truly differentiated code intelligence |
| Debuggers | long | medium | medium | defer unless incident/debug proof flows become a real wedge |

## MVP Definition

### Primary job

Help a developer reach one meaningful proof-backed workflow from inside VS Code.

### Activation event

The activation event for the MVP is:

- user installs the extension
- user completes onboarding or skips it intentionally
- user runs one free workflow
- user sees a proof/result summary

If we cannot make that event reliable, we should not optimize for paid conversion yet.

### MVP features

Ship only the minimum set needed for awareness, activation, and upgrade:

1. Commands
- `RinaWarp: Connect Account`
- `RinaWarp: Open Packs`
- `RinaWarp: Run Free Diagnostic`
- `RinaWarp: Upgrade to Pro`
- `RinaWarp: Open Billing Portal`

2. Walkthrough
- `Connect account`
- `Run your first free workflow`
- `View proof and receipts`
- `Explore packs`
- `Upgrade if you need Pro features`

3. Sidebar view
- account status
- current tier
- featured packs
- recent proof-backed runs
- contextual upgrade CTA only when relevant

4. Entitlement-aware gating
- Free users can run a small number of safe workflows
- Pro unlocks proof export, premium packs, higher limits, and richer recovery actions
- Team unlocks seat-aware and governance-oriented features later

5. Browser-based website handoff
- sign-in opens `rinawarptech.com`
- checkout opens `rinawarptech.com/pricing/`
- billing portal opens `rinawarptech.com/account/`

### Explicit non-goals for MVP

Do not start with these:

- custom debugger integration
- language server implementation
- heavy code intelligence
- large webview application
- enterprise-only administration
- multiple extension SKUs

## Payment Provider Strategy

Keep payment collection outside the extension runtime.

### Recommended default

- use hosted checkout on `rinawarptech.com`
- rely on webhook-driven subscription state updates
- expose billing management through the website account or billing portal flow

### Provider options

- Stripe is the default fit because the site already communicates Stripe-based checkout and billing management
- Paddle is a reasonable fallback if merchant-of-record and tax handling become a priority

### Payment rule

The extension should never collect card details. It should only open a user-initiated browser flow and then refresh entitlement state after completion.

## Recommended Free/Pro Boundary

The free tier should be useful enough to prove value but limited enough to create a natural upgrade path.

### Free

- install and onboard
- connect account or try limited anonymous mode if supported
- browse featured packs
- run one or more low-risk diagnostics
- view short proof summary in VS Code

### Pro

- premium packs
- proof export
- higher usage limits
- longer run history
- richer recovery actions
- priority workflows tied to build, deploy, audit, and incident response

### Team

Keep Team out of the first launch unless the seat and governance story is real. Later Team unlocks can include:

- shared workspace policy
- team receipts and run visibility
- admin controls
- seat management

## Funnel Design

The extension funnel should look like this:

1. Marketplace page view
2. Install
3. Walkthrough starts
4. First free workflow runs
5. Proof summary is shown
6. User connects account if not already connected
7. User hits a real Pro boundary
8. User clicks upgrade CTA
9. Browser checkout on `rinawarptech.com`
10. Webhook updates entitlement
11. User returns and Pro unlock is confirmed

### Funnel rule

Never ask for payment before the user sees one honest example of RinaWarp value.

## UX Rules

These rules matter as much as the feature list:

- Do not auto-open external links without user intent.
- Do not show upgrade prompts on install.
- Do not ask for reviews before the user completes successful workflows.
- Do not hide what data is sent.
- Do not overuse webviews when native VS Code surfaces can do the job.
- Do not use webviews as promotional surfaces for upgrades or sponsorship asks.

## Technical Architecture

### Recommended implementation shape

- commands for all primary actions
- walkthrough for first-run onboarding
- tree/sidebar view for packs, account, and recent runs
- `vscode.env.openExternal` for website handoff
- URI handler for return-to-extension auth and unlock confirmation
- `SecretStorage` for tokens or sensitive local credentials
- lightweight telemetry via VS Code telemetry APIs, gated by user telemetry preference

### Authentication and callback rule

Use a browser-based auth flow with a URI callback and `asExternalUri` handling so the extension works reliably in local and remote development environments.

### Website integration points

The extension should hand off to:

- `/pricing/`
- `/account/`
- `/privacy/`
- `/agents` or the most current packs landing page
- a dedicated `/vscode/companion/` landing page once the funnel is live

### Entitlement model

The extension should not decide pricing or billing locally.

The source of truth should be a backend entitlement response that answers:

- is the user signed in
- what tier the user has
- which packs or limits are enabled
- when the extension should refresh state

### Offline and degraded behavior

Decide these behaviors explicitly before launch:

- whether a recent paid entitlement is cached for a grace period
- what happens when entitlement refresh fails
- how the extension explains locked versus temporarily unavailable states

## UTM and Attribution Plan

Use a consistent UTM taxonomy for every website handoff.

### Required parameters

- `utm_source=vscode`
- `utm_medium=extension`
- `utm_campaign=<campaign_name>`

### Recommended additional parameters

- `utm_content=<surface_or_step>`
- `utm_term=<feature_or_pack>`

### Examples

Upgrade CTA from a blocked export:

```text
https://rinawarptech.com/pricing/?utm_source=vscode&utm_medium=extension&utm_campaign=rinawarp_companion_launch&utm_content=proof_export_blocked&utm_term=proof_export
```

Account connection from walkthrough:

```text
https://rinawarptech.com/account/?utm_source=vscode&utm_medium=extension&utm_campaign=rinawarp_companion_launch&utm_content=walkthrough_connect_account
```

### Minimum attribution standard

Every outbound link that can influence revenue should have UTMs.

### Preferred taxonomy

- `utm_source=vscode`
- `utm_medium=extension`
- `utm_campaign=<release_or_initiative>`
- `utm_content=<placement>`
- `utm_term=<feature_or_pack>`

## Telemetry Plan

Telemetry should only answer questions we actually need for product decisions.

### Collect

- install-to-walkthrough-start
- walkthrough step completion
- first free workflow run
- proof summary viewed
- account connect started
- account connect completed
- upgrade CTA clicked
- Pro unlock confirmed
- weekly active usage by feature area

### Transparency requirements

- respect `isTelemetryEnabled`
- stop sending telemetry when telemetry is disabled
- keep event payloads minimal
- do not collect PII
- publish extension-specific telemetry disclosure, ideally including a `telemetry.json`

### Do not collect

- prompt contents
- source code contents
- secrets
- payment details
- personal data beyond what is already required for account and entitlement systems

## Legal and Trust Posture

This section is a product requirement, not just policy overhead.

### Marketplace and listing hygiene

- include terms and privacy links prominently in the listing and README
- avoid manipulative install tactics or anything that resembles download inflation
- keep package contents free of embedded secrets
- expect Marketplace scanning and trust checks

### Data handling baseline

- default to minimal telemetry
- default to no PII in extension telemetry
- store credentials only in `SecretStorage`
- keep website privacy language and extension behavior aligned
- treat broader GDPR and CCPA implications as a legal review item once account-linked flows are live

### Telemetry rule

Respect VS Code telemetry settings and keep public privacy language aligned with actual extension behavior.

## Marketplace Positioning

### Primary listing recommendation

Name:

- `RinaWarp Companion`

Description:

- `Proof-first workflows for build, audit, deploy, and recovery inside VS Code.`

Suggested category mix:

- `Other`
- `Programming Languages` only if language-specific features become real
- `Testing` only if test and diagnostics workflows are truly first-class

Suggested keyword themes:

- `ai`
- `developer-tools`
- `audit`
- `deployment`
- `recovery`
- `devops`
- `proof`
- `terminal`
- `workspace`

### Trust milestones

- optimize the README, screenshots, and Resources links before launch
- plan for Verified Publisher only as a later trust milestone because it requires Marketplace and domain age history

### Listing rule

The Marketplace page should sell the first useful outcome, not the entire company story.

## Landing Page Recommendation

Create a dedicated website page for VS Code traffic once the extension exists:

- `/vscode/companion/`

That page should answer:

- what the extension does
- what is free
- what Pro unlocks
- how proof-backed workflows work
- which packs are available
- why payment happens on `rinawarptech.com`

It should also answer:

- what happens after checkout
- how unlock and restore access work
- what telemetry is collected in the extension

## Six-Week Rollout

### Week 1

- finalize MVP scope
- define activation event
- define entitlement response contract
- define UTM taxonomy

### Week 2

- build commands
- build walkthrough
- build sidebar view
- wire website links

### Week 3

- implement account connection flow
- implement URI callback handling
- store local secrets safely
- render signed-in and signed-out states

### Week 4

- implement Free versus Pro gates
- implement upgrade prompts at meaningful boundaries
- implement unlock refresh and confirmation
- add telemetry events

### Week 5

- write Marketplace README and screenshots
- create dedicated website landing page
- review privacy and telemetry disclosures
- test onboarding and checkout attribution end to end

### Week 6

- publish MVP
- monitor install to activation conversion
- monitor upgrade click-through
- collect friction reports
- delay satellite extensions until the companion funnel is trustworthy

## Enterprise Distribution

Add this only after the self-serve funnel is working.

### Enterprise path

- ship a VSIX distribution option
- prepare admin and deployment docs
- support seat-based Team entitlements
- evaluate private marketplace distribution only if target customers actually need it

### Enterprise trigger

Team investment is justified when self-serve demand reveals repeated multi-user or governed-environment adoption, not before.

## KPIs

Track the smallest set that can support decisions:

### Awareness

- Marketplace page views
- install count
- install-to-walkthrough-start rate

### Activation

- walkthrough completion rate
- first free workflow rate
- proof summary view rate
- account connection rate

### Monetization

- upgrade CTA click-through rate
- checkout start rate
- checkout completion rate
- extension unlock confirmation rate

### Retention

- weekly active users
- repeat workflow rate
- pack engagement rate

## First Experiment Backlog

Run these only after the baseline funnel is live:

1. Walkthrough order
- variant A starts with `Connect Account`
- variant B starts with `Run a Free Diagnostic`

2. Upgrade copy
- variant A uses `Upgrade to Pro`
- variant B uses `Unlock proof-backed workflows`

3. Landing page destination
- variant A uses `/pricing/`
- variant B uses `/vscode/companion/`

4. Prompt timing
- variant A prompts at first blocked Pro feature
- variant B prompts after two successful free workflows

5. Review timing
- variant A prompts after first success
- variant B prompts after multiple successful runs

6. Landing destination
- variant A sends upgrade clicks to `/pricing/`
- variant B sends upgrade clicks to `/vscode/companion/`

7. Upgrade copy
- variant A uses `Upgrade to Pro`
- variant B uses `Unlock proof-backed execution`

8. Onboarding order
- variant A starts with account connection
- variant B starts with running a free pack

## Decision Rules

Use these rules to avoid premature complexity:

- If activation is weak, improve first-run value before adding new extension types.
- If activation is healthy but upgrade is weak, improve Pro boundaries and landing page clarity.
- If upgrade is healthy but retention is weak, improve repeat workflows and pack usefulness.
- Do not build a language server or debugger integration until the companion extension proves demand.
- Do not invest in enterprise packaging before the self-serve funnel shows real pull.

## Recommended Next Actions

1. Keep desktop revenue as the primary near-term launch path.
2. Treat the VS Code extension as the next growth channel, not a substitute for fixing the core billing loop.
3. Build `RinaWarp Companion` before any theme, snippet, or extension pack work.
4. Create the dedicated landing page and entitlement contract before Marketplace launch.
5. Publish only when install, activation, and upgrade attribution are measurable.

## Bottom Line

The extension should not try to be a separate business model. It should be the fastest path from developer curiosity to proof-backed product value, with payment and account ownership staying on `rinawarptech.com`.
