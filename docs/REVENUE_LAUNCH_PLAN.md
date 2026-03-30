# Revenue Launch Plan

Date: 2026-03-23

This plan is for the next phase after the desktop RC freeze.

Related follow-on growth channel plan:

- [VS_CODE_EXTENSION_REVENUE_PLAN.md](/home/karina/Documents/rinawarp-terminal-pro/docs/VS_CODE_EXTENSION_REVENUE_PLAN.md)

The goal is not more internal invention. The goal is to get RinaWarp Terminal Pro:

1. shippable
2. purchasable
3. understandable
4. measurable

## Core Rule

Do not prioritize internal platform work unless it directly improves one of these:

- release and install
- billing and entitlement flow
- product positioning and conversion
- activation and retention measurement

## Current Anchor

- RC tag: `v1.1.9-rc1`
- Freeze commit: `12a0b3a`
- Desktop RC verifier: `npm run verify:desktop:rc`

## Phase 1: Revenue-Critical

These are the tasks that determine whether a brand-new customer can go from website to paid unlocked desktop app without manual help.

### 1. Release Promotion

- Promote `v1.1.9-rc1` to the final desktop release if no blocker appears.
- Publish the final desktop artifacts users are meant to install.
- Verify the updater/feed points to the final release.
- Verify the download page points to the same canonical release artifact.
- Keep one canonical download URL and one canonical release story.

### 2. Customer Billing Path

The full customer loop must work:

- landing page
- download
- install
- account creation or sign-in boundary
- checkout
- success state
- app unlock
- billing portal
- restore purchase

Minimum acceptance:

- a new user can buy Pro and see the app unlock without manual support
- a returning user can restore access without guessing
- downgrade or expired-license behavior is understandable and honest

### 3. First-Run Activation

The app must make the first few minutes obvious:

- workspace picker is visible and easy to understand
- help response explains what the product can do
- self-check works cleanly
- build/test/deploy next steps are understandable
- receipts and recovery feel trustworthy

Minimum acceptance:

- a new customer can choose a workspace, ask a question, and run one trusted action without confusion

## Phase 2: Conversion-Critical

These tasks determine whether people understand why to pay.

### 1. Keep the Offer Simple

Positioning should stay simple:

- Product: `RinaWarp Terminal Pro`
- Category: proof-first agent workbench
- Job: build, test, deploy with receipts and recovery

Initial pricing should stay simple:

- free tier or trial
- one paid Pro plan

The buyer should understand in seconds:

- what it does
- who it is for
- why it is different
- why it is worth paying for

### 2. Tighten the Site Story

- Homepage should explain the trust/proof wedge clearly.
- Pricing should map directly to actual app unlocks.
- Download page should match supported platforms and current release.
- Screenshots or a short demo should show the real first-run and proof-backed workflow.

## Phase 3: Growth-Critical

These tasks determine whether revenue becomes measurable and repeatable instead of anecdotal.

### 1. Measure the Funnel

Track at least these four layers:

- Traffic
  - homepage
  - pricing
  - download
- Conversion
  - download click
  - install
  - checkout start
  - checkout completion
- Activation
  - workspace selected
  - first prompt
  - self-check run
  - first successful build/test/deploy flow
- Retention
  - return sessions
  - repeated trusted runs
  - continued paid usage

### 2. Use Real Feedback

After release:

- collect real blocker reports
- measure activation drop-off
- measure entitlement failures
- improve first-run and recovery based on observed friction

## Blockers Before Revenue Launch

These are revenue blockers and should win over everything else:

- final release not promoted from the RC
- checkout does not reliably unlock the app
- restore purchase does not reliably work
- download/install path is confusing or inconsistent
- updater/feed does not match the final release
- new users do not understand how to start
- pricing or website claims do not match the app

## Non-Blockers After Revenue Launch

These are important, but should not delay initial revenue if the core path is real:

- broader ecosystem work
- background-task expansion
- additional capability packs
- deeper internal architecture cleanup
- non-critical UI polish
- secondary growth experiments before funnel basics are instrumented

## Recommended Next Sequence

1. Promote the current RC to final if no blocker appears.
2. Verify the complete checkout-to-unlock path with a real customer seat.
3. Reconcile download page, updater feed, and release artifact into one canonical release surface.
4. Tighten homepage and pricing copy around the proof-first wedge.
5. Add or verify analytics for download, checkout, unlock, and activation.
6. Launch publicly in a controlled way.
7. Treat real customer friction as the next roadmap input.

## One-Sentence Focus

The next job is not to make RinaWarp more elaborate. The next job is to make it easy for a new customer to understand it, buy it, unlock it, and keep using it.
