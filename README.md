# RinaWarp

<p align="center">
  <strong>One platform, two product surfaces: Terminal Pro for serious execution, Companion for the fastest VS Code start.</strong>
</p>

<p align="center">
  <a href="https://rinawarptech.com">Website</a> •
  <a href="https://rinawarptech.com/download">Download</a> •
  <a href="https://rinawarptech.com/security">Security</a> •
  <a href="https://github.com/Bigsgotchu/rinawarp-terminal-pro/releases">Releases</a>
</p>

## What is RinaWarp?

RinaWarp is the platform and shared account layer behind the current product line.

Today the platform has two product surfaces:

- `RinaWarp Terminal Pro` - the flagship proof-first desktop workbench for build, test, deploy, and recovery workflows
- `RinaWarp Companion` - the VS Code on-ramp for account connect, free diagnostic value, pack discovery, and entitlement refresh

Terminal Pro is the deeper execution environment. Companion is the fastest way to start inside the editor.

### Key Features

- **Natural Conversation** - Describe problems in plain English. Rina understands context and responds with explanation, plan, and actions.
- **Safe Execution** - Every action is explained before execution. High-impact commands require explicit approval.
- **Proof-Backed Work** - Runs, receipts, and execution traces are attached to the thread so “done” always has proof behind it.
- **Local-First** - Your system data never leaves your machine. No cloud dependencies, no privacy concerns.

## Quick Install

```bash
curl -fsSL https://raw.githubusercontent.com/Bigsgotchu/rinawarp-terminal-pro/main/install.sh | bash
```

Or download directly from the [Releases](https://github.com/Bigsgotchu/rinawarp-terminal-pro/releases) page.

### System Requirements

- **macOS**: 10.15 (Catalina) or later
- **Linux**: Ubuntu 18.04+ or equivalent
- **Windows**: Windows 10 or later

## Building from Source

This repository is the RinaWarp monorepo.

Current primary product surfaces:

- `apps/terminal-pro`
- `apps/rinawarp-companion`
- `website/`

Canonical operating guidance:

- [docs/PRODUCT_OPERATING_MODEL.md](/home/karina/Documents/rinawarp-terminal-pro/docs/PRODUCT_OPERATING_MODEL.md)

### Prerequisites

- Node.js 18+
- pnpm 8+
- Rust (for some native modules)

### Build Steps

```bash
# Install dependencies
pnpm install

# Build the desktop app
cd apps/terminal-pro
pnpm build
```

## Website Deployment

The public site at `rinawarptech.com` is deployed through Cloudflare Pages/Workers.

Canonical production deploy:

```bash
npm run deploy:pages
```

That path builds the Pages bundle and publishes it with `wrangler pages deploy`.

Vercel is not required for the website. Any Vercel tooling in this repo is optional and exists for deploy-capability demos, preview experiments, or provider-proof flows inside Terminal Pro.

## Version

Current version: **v1.1.9**

## License

Copyright © 2026 RinaWarp Technologies LLC. All rights reserved.

## Support

- Email: support@rinawarptech.com
- Website: https://rinawarptech.com
