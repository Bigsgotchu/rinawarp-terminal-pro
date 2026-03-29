# Metrics Implementation Plan

Date: 2026-03-29

This document turns [METRICS_SCOREBOARD.md](/home/karina/Documents/rinawarp-terminal-pro/docs/METRICS_SCOREBOARD.md) into an implementation map.

It answers:

- which metrics already have event plumbing
- which product surfaces own which events
- which metrics are still missing
- what the next instrumentation tasks should be

## Canonical Systems

### Website

Primary surface:

- `rinawarptech.com`

Current code:

- [website/workers/router.ts](/home/karina/Documents/rinawarp-terminal-pro/website/workers/router.ts)
- [website/workers/api/purchase.ts](/home/karina/Documents/rinawarp-terminal-pro/website/workers/api/purchase.ts)

Current state:

- checkout UI exists
- restore and account flows exist
- public funnel events are not yet clearly defined as a canonical website analytics contract

### Terminal Pro

Primary analytics code:

- [apps/terminal-pro/src/analytics/core.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/analytics/core.ts)
- [apps/terminal-pro/src/analytics/funnel.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/analytics/funnel.ts)
- [apps/terminal-pro/src/renderer/services/rendererTelemetry.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/renderer/services/rendererTelemetry.ts)
- [apps/terminal-pro/src/renderer/settings/panels/licenseRuntime.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/renderer/settings/panels/licenseRuntime.ts)

Current state:

- desktop event transport exists
- funnel events exist for `signup`, `first_run`, `first_block`, `upgrade_view`, and `paid`
- some activation and trust events exist
- event coverage is incomplete for the full business funnel

### Companion

Primary analytics code:

- [apps/rinawarp-companion/src/telemetry.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/rinawarp-companion/src/telemetry.ts)
- [apps/rinawarp-companion/telemetry.json](/home/karina/Documents/rinawarp-terminal-pro/apps/rinawarp-companion/telemetry.json)
- [apps/rinawarp-companion/src/extension.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/rinawarp-companion/src/extension.ts)
- [apps/rinawarp-companion/src/chat.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/rinawarp-companion/src/chat.ts)

Current state:

- Companion has the cleanest documented telemetry contract in the repo
- events are minimal and privacy-aware
- this is a good model for the website and Terminal Pro event catalog

### Server and Revenue Backend

Primary analytics code:

- [packages/rinawarp-agentd/src/analytics.ts](/home/karina/Documents/rinawarp-terminal-pro/packages/rinawarp-agentd/src/analytics.ts)
- [packages/rinawarp-agentd/src/telemetry/events.ts](/home/karina/Documents/rinawarp-terminal-pro/packages/rinawarp-agentd/src/telemetry/events.ts)
- [packages/rinawarp-agentd/src/server.ts](/home/karina/Documents/rinawarp-terminal-pro/packages/rinawarp-agentd/src/server.ts)

Current state:

- server-side PostHog integration exists
- revenue and plan-execution events exist
- the event set is useful but not yet tied back to one founder-facing scoreboard

## Canonical Business Events

These should become the shared business language across website, desktop, Companion, and backend.

### Acquisition

- `site_home_viewed`
- `site_pricing_viewed`
- `site_download_viewed`
- `site_download_clicked`

### Conversion

- `checkout_started`
- `checkout_succeeded`
- `checkout_failed`
- `billing_portal_opened`

### Activation

- `desktop_first_launch`
- `workspace_selected`
- `first_prompt_sent`
- `first_trusted_run_started`
- `first_trusted_run_completed`
- `restore_purchase_started`
- `restore_purchase_succeeded`
- `restore_purchase_failed`

### Retention

- `desktop_return_session`
- `trusted_run_completed`
- `companion_extension_activated`
- `companion_chat_prompt_sent`

### Support and Risk

- `entitlement_refresh_failed`
- `unlock_mismatch_detected`
- `recovery_flow_shown`
- `support_bundle_exported`

## Canonical Activation Events

These matter most for running the company.

### Terminal Pro activation event

Recommended canonical event:

- `first_trusted_run_completed`

Reason:

- sending a prompt is not enough
- seeing the UI is not enough
- the real value moment is a completed proof-backed run

### Companion activation event

Recommended canonical event:

- `free_diagnostic_started`

Secondary activation event:

- `chat_prompt_sent`

Reason:

- Companion should measure value before paywall pressure

## Scoreboard Mapping

### Website metrics

| Metric | Current status | Current code | Needed next |
| --- | --- | --- | --- |
| homepage visits | unknown/implicit | website route exists, no canonical event contract | add `site_home_viewed` |
| pricing page visits | unknown/implicit | website route exists, checkout UI in router | add `site_pricing_viewed` |
| download page visits | unknown/implicit | download routes exist | add `site_download_viewed` |
| download clicks | missing | public download routes exist | add `site_download_clicked` with platform |
| checkout start | partial | checkout UI and `/api/checkout` exist | emit `checkout_started` before redirect |
| checkout completion | partial | Stripe/webhook path exists in backend | map to `checkout_succeeded` |

### Terminal Pro metrics

| Metric | Current status | Current code | Needed next |
| --- | --- | --- | --- |
| app launch | present | `app_started` in [core.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/analytics/core.ts) | map to dashboard |
| first run | present | `funnel_first_run` in [funnel.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/analytics/funnel.ts) | define trigger ownership clearly |
| first block | present | `funnel_first_block` in [funnel.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/analytics/funnel.ts) | connect to dashboard |
| upgrade view | present | `funnel_upgrade_view` in [funnel.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/analytics/funnel.ts) | verify it fires from all upgrade CTAs |
| paid unlock | present | `funnel_paid` in [funnel.ts](/home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro/src/analytics/funnel.ts) and license runtime | tie to real entitlement refresh |
| first trusted run completed | partial | `agent_run_completed`, `proof_backed_run_seen` exist | add one canonical `first_trusted_run_completed` event |
| workspace selected | missing | no single event found | add event from workspace picker/selection boundary |
| first prompt sent | missing/implicit | starter intents and chat flow exist | add `first_prompt_sent` |
| restore purchase success/failure | partial | license runtime already tracks paid state | add explicit restore success/failure events |

### Companion metrics

| Metric | Current status | Current code | Needed next |
| --- | --- | --- | --- |
| extension activated | present | `extension_activated` | wire to dashboard |
| account connect started | present | `connect_account_started` | wire to dashboard |
| free diagnostic started | present | `free_diagnostic_started` | make this the Companion activation metric |
| open packs clicked | present | `open_packs_clicked` | wire to dashboard |
| upgrade clicked | present | `upgrade_clicked` | wire to funnel |
| purchase returned | present | `purchase_returned` | tie to conversion reporting |
| billing portal clicked | present | `billing_portal_clicked` | wire to retention/admin reporting |
| refresh entitlements started | present | `refresh_entitlements_started` | add success/failure pair if needed |
| chat prompt sent | present | `chat_prompt_sent` | wire to engagement reporting |
| chat response received | present | `chat_response_received` | use for quality and mode mix |
| chat response failed | present | `chat_response_failed` | use for reliability |

### Backend metrics

| Metric | Current status | Current code | Needed next |
| --- | --- | --- | --- |
| subscription created | present | `subscription_created` in [analytics.ts](/home/karina/Documents/rinawarp-terminal-pro/packages/rinawarp-agentd/src/analytics.ts) | map to checkout success |
| subscription failed | present | `subscription_failed` in [analytics.ts](/home/karina/Documents/rinawarp-terminal-pro/packages/rinawarp-agentd/src/analytics.ts) | map to funnel drop-off |
| new users | partial | `user_login`, `workspace_created` increment metrics | define business meaning clearly |
| plan executions | present | `plan_execution_*` events exist | tie to trust/retention dashboard |
| failure classes | present | local metrics persistence exists | expose in founder dashboard |

## Immediate Instrumentation Tasks

### Priority 1

- define the canonical website event list in one file
- add website events for homepage, pricing, download, and checkout start
- add explicit `workspace_selected` in Terminal Pro
- add explicit `first_prompt_sent` in Terminal Pro
- add explicit `restore_purchase_succeeded` and `restore_purchase_failed` in Terminal Pro

### Priority 2

- add `first_trusted_run_completed` in Terminal Pro and mark it once per device/session funnel
- map Companion telemetry events into the same reporting backend used by desktop/server
- define one founder-facing dashboard view for acquisition, conversion, activation, and retention

### Priority 3

- add support-oriented counters like `support_bundle_exported`
- add recovery quality events like `recovery_flow_shown` and `recovery_completed`
- document event ownership so multiple surfaces do not emit the same metric inconsistently

## Recommended Owners

### Website owner

- landing page views
- pricing views
- download clicks
- checkout start

### Desktop owner

- first launch
- workspace selection
- first prompt
- first trusted run
- upgrade view
- restore purchase outcomes

### Backend owner

- checkout success
- subscription lifecycle
- entitlement persistence success/failure
- run completion and failure aggregation

### Companion owner

- extension activation
- free diagnostic activation
- chat engagement
- entitlement refresh loop

## Suggested Next Build Sequence

1. create one website event utility and emit `site_home_viewed`, `site_pricing_viewed`, `site_download_clicked`, and `checkout_started`
2. add Terminal Pro renderer events for `workspace_selected`, `first_prompt_sent`, and `restore_purchase_*`
3. define a single dashboard spec using the event names in this document
4. verify privacy language matches the actual event list

## Decision Rule

Do not add more analytics categories until the following are visible and trusted:

- website visit to checkout
- checkout to paid
- paid to desktop unlock
- desktop first launch to first trusted run
- restore purchase success/failure
