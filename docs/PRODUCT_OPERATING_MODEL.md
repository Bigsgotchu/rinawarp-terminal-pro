# RinaWarp Product Operating Model

Date: 2026-03-29

This document is the canonical operating model for how RinaWarp should present, build, and release its current product line.

## Core Recommendation

RinaWarp should operate as:

- one platform brand
- one shared account and entitlement system
- one monorepo
- two distinct product surfaces

Those two product surfaces are:

- `RinaWarp Terminal Pro`
- `RinaWarp Companion`

Do not collapse them into one product story.

Do not split them into separate repos yet.

## Brand Model

### Platform Brand

`RinaWarp` is the platform, company, and account layer.

Use `RinaWarp` when talking about:

- the account
- entitlements
- billing
- shared capability access
- the product family as a whole

### Flagship Product

`RinaWarp Terminal Pro` is the flagship product.

Its role:

- serious execution environment
- proof, receipts, and recovery
- deeper workflow continuity
- strongest paid value realization

### On-Ramp Product

`RinaWarp Companion` is the lightweight chat-first VS Code on-ramp.

Its role:

- fastest way to start inside the editor
- conversational control surface for diagnostics, packs, and next safe steps
- account connect and entitlement refresh
- free diagnostic and starter value
- pack discovery, upgrade handoff, and return flow

## Message Hierarchy

The intended hierarchy is:

- `RinaWarp` = the platform and account
- `Terminal Pro` = the serious execution environment
- `Companion` = the fastest way to start inside VS Code

Companion should not be positioned as "Terminal Pro but worse."

Companion should be positioned as:

- the lower-friction entry surface
- the editor-native path into the platform
- the chat-first VS Code surface for RinaWarp
- the first-win channel

## Commercial Model

Use one shared account and entitlement system.

Do not create separate billing silos unless later business evidence forces that split.

### Recommended Commercial Shape

Free tier:

- Companion install
- limited free diagnostic or starter flow
- limited pack discovery

Paid tier:

- buys RinaWarp capability access
- unlocks more advanced use across the shared account
- Terminal Pro is the clearest place where deeper paid value is realized

### Important Framing

Users should feel like they are buying:

- `RinaWarp access`
- `RinaWarp capability`

Users should not feel like they are buying:

- a disconnected Companion-only SKU

## Repo Model

Keep one monorepo for now.

Treat apps as separate release units inside the same repo.

### Current Product Structure

- `apps/terminal-pro`
- `apps/rinawarp-companion`
- `website/`

### Shared Docs Should Cover Only

- account and billing
- product strategy
- release policy
- integration mapping

### Repo Rules

- each app owns its own build, test, and packaging scripts
- shared scripts should exist only when truly cross-product
- docs should explicitly identify whether they are:
  - platform-wide
  - Terminal Pro only
  - Companion only

## Release Workflow

Use one repo and separate release lanes.

### Terminal Pro Release Lane

- desktop release process
- heavier QA
- proof, recovery, and runtime checks
- packaged app validation

### Companion Release Lane

- build
- tests
- VSIX packaging
- clean-profile install
- account and entitlement manual verification
- publish as pre-release first

### Shared Release Gate

The following are cross-surface requirements:

- website, pricing, account, and download links stay correct for both products
- auth and entitlement changes require cross-surface verification
- pricing language must match actual unlock behavior

## Ownership Rules

### Platform-Wide Concerns

- auth
- billing
- entitlement state
- website messaging
- telemetry policy
- capability catalog language

### Terminal Pro Owns

- execution engine
- proof and recovery UX
- deep runtime workflows
- richer workspace-native interaction

### Companion Owns

- VS Code onboarding
- chat-first editor assistance
- account connection from editor context
- lightweight diagnostic preview
- pack browsing, upsell, and return flow

## Site Strategy

The homepage should not try to explain everything equally.

### Site Positioning

- make `Terminal Pro` the flagship
- give `Companion` a crisp role
- present one RinaWarp account and one capability story

### Suggested Story Flow

- hero: RinaWarp helps you run real work with proof
- primary CTA: Download Terminal Pro
- secondary CTA: Start in VS Code with Companion
- product section:
  - Terminal Pro = full execution environment
  - Companion = chat-first VS Code surface
- pricing:
  - one RinaWarp account
  - capabilities unlocked across surfaces where relevant

## What To Measure

### Companion

- installs
- connect-account completion
- free diagnostic completion
- pack clickthrough
- upgrade conversion
- successful return-to-extension entitlement refresh

### Terminal Pro

- download to active use
- first successful run
- recovery usage
- retained usage after first session
- paid conversion from serious usage

## Decision Rule

If Companion remains mostly an acquisition and activation surface:

- keep one repo
- keep one shared account model
- keep the current operating model

If Companion later develops its own deep roadmap and user base:

- revisit separate team ownership
- revisit separate repo ownership
- revisit more independent pricing presentation

But not yet.

## Current Operating Recommendation

The operating recommendation today is:

1. keep one repo
2. keep one shared account model
3. keep two distinct product surfaces
4. keep Terminal Pro as the flagship
5. launch Companion as the pre-release acquisition and on-ramp channel
