# RinaWarp Terminal Pro

<p align="center">
  <strong>Proof-First AI Workbench for Build, Test, Deploy, and Recovery</strong>
</p>

<p align="center">
  <a href="https://rinawarptech.com">Website</a> •
  <a href="https://rinawarptech.com/download">Download</a> •
  <a href="https://rinawarptech.com/security">Security</a> •
  <a href="https://github.com/Bigsgotchu/rinawarp-terminal-pro/releases">Releases</a>
</p>

## What is RinaWarp?

RinaWarp Terminal Pro is an agent-first desktop app for build, test, deploy, and system-repair workflows. You tell Rina what you want in plain language, she explains the plan, runs the work in the background, and keeps proof attached to the thread.

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

This repository contains the source code for RinaWarp Terminal Pro.

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

## Version

Current version: **v1.1.9**

## License

Copyright © 2026 RinaWarp Technologies LLC. All rights reserved.

## Support

- Email: support@rinawarptech.com
- Website: https://rinawarptech.com
