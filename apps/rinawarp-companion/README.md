# RinaWarp Companion

Chat-first proof-aware workflows for build, audit, deploy, and recovery inside VS Code.

Published listing:

- [Marketplace listing](https://marketplace.visualstudio.com/items?itemName=rinawarpbykarinagilley.rinawarp-companion)

RinaWarp Companion is the chat-first VS Code entry point into the RinaWarp platform:

1. Connect account
2. Ask Companion for the next safe step
3. Run a free workflow
4. Explore capability packs
5. Upgrade on `rinawarptech.com`
6. Refresh entitlements back in VS Code

## What It Does

- Chat with Rina directly inside VS Code
- Adds a `RinaWarp` activity bar surface with account and plan status
- Adds a `Chat` view as the primary conversational surface for asking Rina about diagnostics, packs, workspace questions, and next safe steps
- Runs a free workspace diagnostic before asking users to upgrade
- Guides first-run onboarding with a built-in walkthrough
- Opens pack, pricing, billing, and privacy flows on `rinawarptech.com`
- Stores local session and entitlement state in `SecretStorage`
- Supports browser callback return into VS Code for account linking
- Supports browser callback return into VS Code after purchase completion

## Release Status

This extension is now prepared as a full release candidate. The account, chat, entitlement, and pricing loop is real, but proof-backed execution depth is still intentionally narrower than Terminal Pro by design.

Best first-run path:

1. Install from Marketplace
2. Open `RinaWarp` in the activity bar
3. Run `RinaWarp: Connect Account`
4. Open `Chat`
5. Run `RinaWarp: Run Free Diagnostic`

## Product Role

RinaWarp Companion is:

- the chat-first VS Code surface for RinaWarp
- the fastest way to start in-editor with a shared RinaWarp account
- the lower-friction path into diagnostics, pack discovery, and upgrade handoff

RinaWarp Companion is not:

- full Terminal Pro parity
- the deepest proof-and-recovery surface in the product line
- a disconnected product with its own billing silo

Companion is also the intended long-term home for any useful VS Code capabilities that still live in older internal RinaWarp extensions.

## Current Commands

- `RinaWarp: Connect Account`
- `RinaWarp: Run Free Diagnostic`
- `RinaWarp: Open Packs`
- `RinaWarp: Upgrade to Pro`
- `RinaWarp: Verify Purchase Return`
- `RinaWarp: Open Billing Portal`
- `RinaWarp: Open Privacy Details`
- `RinaWarp: Refresh Entitlements`

## Workspace Trust

RinaWarp Companion supports limited use in Restricted Mode.

- Safe account and website flows can work in untrusted workspaces
- Workspace-derived proof-backed actions should only run in trusted workspaces

## Billing Model

RinaWarp Companion uses the shared RinaWarp account model:

- the extension is installed from VS Code
- paid access is obtained on `rinawarptech.com`
- premium capability is unlocked by entitlement checks after sign-in
- users buy RinaWarp capability access, not a disconnected Companion-only license

## Privacy and Telemetry

RinaWarp Companion is designed to follow VS Code telemetry guidance:

- telemetry is only used when VS Code telemetry is enabled
- event data should remain minimal and non-PII
- tokens are stored in `SecretStorage`
- card or billing details are never collected inside the extension
- chat requests send only the prompt plus minimal derived workspace context such as the last diagnostic summary and recommended pack

See:

- [Privacy Policy](https://rinawarptech.com/privacy/)
- [Terms](https://rinawarptech.com/terms/)
- [telemetry.json](./telemetry.json)
- [SUPPORT.md](./SUPPORT.md)
- [PUBLISHING.md](./PUBLISHING.md)
- [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md)
- [CONSOLIDATION_PLAN.md](./CONSOLIDATION_PLAN.md)

## External Network Behavior

RinaWarp Companion may:

- open browser tabs to `rinawarptech.com` for account, pricing, packs, billing, and privacy flows
- call the configured RinaWarp API endpoint to refresh entitlements after sign-in
- call the website chat endpoint for Companion chat replies after the user explicitly sends a prompt

No workspace content should be sent remotely until the user explicitly starts a workflow that requires it.

## Build

```bash
npm --workspace apps/rinawarp-companion run build
```

Package a release VSIX:

```bash
npm --workspace apps/rinawarp-companion run package:vsix
```

Package a pre-release VSIX if you want another staged preview build:

```bash
npm --workspace apps/rinawarp-companion run package:vsix:pre-release
```

Run Companion validation from the repo root:

```bash
npm run test:companion
```

If your environment is still on Node 18, use the pinned `vsce` dependency in this package rather than the newer `@vscode/vsce` 3.x line.

## Related Plan

The execution plan for turning this extension into a revenue channel lives in [docs/VS_CODE_EXTENSION_REVENUE_PLAN.md](/home/karina/Documents/rinawarp-terminal-pro/docs/VS_CODE_EXTENSION_REVENUE_PLAN.md).
