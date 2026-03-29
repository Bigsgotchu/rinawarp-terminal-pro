# RinaWarp Companion

Proof-first workflows for build, audit, deploy, and recovery inside VS Code.

RinaWarp Companion is the extension entry point for the RinaWarp revenue loop:

1. Connect account
2. Run a free workflow
3. Explore capability packs
4. Hit a meaningful Pro boundary
5. Upgrade on `rinawarptech.com`
6. Refresh entitlements back in VS Code

## What It Does

- Adds a `RinaWarp` activity bar surface with account and plan status
- Adds a `Chat` view for asking Rina about diagnostics, packs, and next safe steps
- Guides first-run onboarding with a built-in walkthrough
- Opens pack, pricing, billing, and privacy flows on `rinawarptech.com`
- Stores local session and entitlement state in `SecretStorage`
- Supports browser callback return into VS Code for account linking
- Supports browser callback return into VS Code after purchase completion

## Preview Status

This extension is currently a Preview scaffold. The account, entitlement, and pricing loop is real at the UI and integration-shape level, but some workflow execution remains intentionally narrow while the first proof-backed workflow is being hardened.

## Current Commands

- `RinaWarp: Connect Account`
- `RinaWarp: Run Free Diagnostic`
- `RinaWarp: Open Packs`
- `RinaWarp: Upgrade to Pro`
- `RinaWarp: Open Billing Portal`
- `RinaWarp: Open Privacy Details`
- `RinaWarp: Refresh Entitlements`

## Workspace Trust

RinaWarp Companion supports limited use in Restricted Mode.

- Safe account and website flows can work in untrusted workspaces
- Workspace-derived proof-backed actions should only run in trusted workspaces

## Billing Model

RinaWarp Companion is a bring-your-own-license style extension:

- the extension is installed from VS Code
- paid access is obtained on `rinawarptech.com`
- premium capability is unlocked by entitlement checks after sign-in

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

Package a Preview VSIX:

```bash
npm --workspace apps/rinawarp-companion run package:vsix
```

Run Companion validation from the repo root:

```bash
npm run test:companion
```

If your environment is still on Node 18, use the pinned `vsce` dependency in this package rather than the newer `@vscode/vsce` 3.x line.

## Related Plan

The execution plan for turning this extension into a revenue channel lives in [docs/VS_CODE_EXTENSION_REVENUE_PLAN.md](/home/karina/Documents/rinawarp-terminal-pro/docs/VS_CODE_EXTENSION_REVENUE_PLAN.md).
