# RinaWarp Terminal Pro

**A proof-first AI agent workbench for technical work**

RinaWarp Terminal Pro is an Electron desktop application that helps you build, test, deploy, diagnose, and recover technical work through verified runs, receipts, and a calm agent-first interface.

## Features

✅ **Proof-First Execution** - Every action generates cryptographic receipts for verification
✅ **Receipt-Backed Recovery** - Resume failed runs from the last successful checkpoint
✅ **Local & Remote Agents** - Run agents locally or connect to hosted infrastructure
✅ **Build/Test/Deploy Workflows** - Integrated CI/CD capabilities
✅ **Self-Hosted Updates** - Automatic updates via electron-updater + Cloudflare
✅ **Dark, Calm UI** - Premium workbench design with proof/trust accents

## Architecture

```
RinaWarp Terminal Pro/
├── electron/              # Main process (Node/TypeScript)
│   ├── main.ts            # App lifecycle, window management
│   ├── preload.ts         # IPC bridge (secure)
│   ├── agentd/            # Agent orchestration engine
│   │   ├── orchestrator.ts # Run management
│   │   ├── executor.ts     # Agent execution (local/remote)
│   │   └── receipts.ts     # Receipt generation & verification
│   ├── ipc/               # IPC handlers
│   └── store/             # Data persistence (MongoDB)
├── renderer/             # React UI
│   └── src/
│       ├── components/
│       │   ├── Workbench.js    # Main agent interface
│       │   ├── RunsList.js     # Run history
│       │   ├── Settings.js     # System settings
│       │   └── ui/             # Shadcn components
│       └── App.js
├── shared/               # Type contracts (IPC)
├── cloudflare-worker/    # Update/billing infrastructure
└── package.json          # Root Electron app
```

## Tech Stack

- **Desktop Framework**: Electron 28
- **Language**: TypeScript
- **UI**: React 19 + Tailwind CSS + Shadcn/UI
- **Database**: MongoDB (local)
- **Updates**: electron-updater + Cloudflare Worker + R2
- **IPC**: Type-safe contracts with contextBridge
- **Build**: electron-builder

## Prerequisites

- Node.js 18+
- Yarn 1.22+
- MongoDB (running locally on port 27017)
- TypeScript 5+

## Getting Started

### 1. Install Dependencies

```bash
# Install root and renderer dependencies
yarn install

# This will automatically run postinstall to set up renderer
```

### 2. Set Up MongoDB

Make sure MongoDB is running locally:

```bash
mongod --dbpath /path/to/data
```

The app will connect to `mongodb://localhost:27017` by default.

### 3. Development

```bash
# Start both renderer and electron in dev mode
yarn dev

# Or run separately:
yarn dev:renderer  # Start React dev server (port 3000)
yarn dev:electron  # Start Electron with hot reload
```

### 4. Build for Production

```bash
# Build both renderer and electron
yarn build

# Package as distributable
yarn package
```

This creates installers in the `release/` directory for your platform.

## Project Structure Details

### Main Process (electron/)

The main process runs Node.js and manages:
- App lifecycle and window creation
- Agent orchestration (local execution)
- IPC communication with renderer
- Database operations
- Auto-updates

**Key Files:**
- `main.ts` - Entry point, window creation, lifecycle
- `preload.ts` - Secure IPC bridge using contextBridge
- `agentd/orchestrator.ts` - Manages runs and receipts
- `agentd/executor.ts` - Executes agent tasks
- `ipc/handlers.ts` - All IPC request handlers

### Renderer Process (renderer/)

The renderer runs React and provides the UI:
- Workbench for creating and monitoring runs
- Run history with receipts
- Settings and diagnostics
- Real-time progress updates via IPC

**Key Components:**
- `Workbench.js` - Main agent interface
- `ExecutionOutput.js` - Live output display
- `ReceiptViewer.js` - Proof/receipt display
- `RunsList.js` - Historical runs
- `Settings.js` - System info and updates

### Shared Contracts (shared/)

Type-safe IPC contracts ensure main and renderer communicate correctly:
- Run data structures
- Receipt/proof formats
- IPC channel definitions
- Request/response types

### Cloudflare Worker (cloudflare-worker/)

Handles production infrastructure:
- **Update feed**: electron-updater endpoints
- **Download hosting**: R2 for release artifacts
- **Billing**: Stripe checkout and webhooks
- **Account portal**: Customer management

## IPC Communication

The app uses type-safe IPC between main and renderer:

```typescript
// In renderer:
const response = await window.electronAPI.runs.create(prompt, 'local');

// In main process (via IPC handler):
ipcMain.handle('run:create', async (_event, data) => {
  const run = await orchestrator.createRun(data.prompt, data.mode);
  return { success: true, data: run };
});
```

All channels are defined in `shared/contracts.ts` for type safety.

## Agent Orchestration

The agent orchestrator manages execution with receipts:

1. **Create Run** - User submits prompt
2. **Execute** - Agent breaks down and executes task
3. **Generate Receipts** - Each step produces a cryptographic receipt
4. **Store** - Runs and receipts saved to MongoDB
5. **Recovery** - Failed runs can resume from last successful receipt

### Receipt Structure

```typescript
{
  id: string;              // Unique receipt ID
  runId: string;           // Parent run ID
  timestamp: string;       // ISO timestamp
  action: string;          // What was done
  status: 'success' | 'error';
  output?: string;         // Action output
  proof: {
    hash: string;          // SHA-256 hash
    signature?: string;    // Optional signature
  }
}
```

## Cloudflare Infrastructure

### Setup

```bash
cd cloudflare-worker

# Install Wrangler CLI
yarn global add wrangler

# Login to Cloudflare
wrangler login

# Create R2 bucket
wrangler r2 bucket create rinawarp-releases

# Set secrets
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put AUTH_SECRET

# Deploy
yarn deploy
```

### Endpoints

- `GET /api/updates/latest` - Latest version JSON
- `GET /api/updates/{platform}` - electron-updater YAML feed
- `GET /download/{version}/{filename}` - Download releases
- `POST /api/billing/checkout` - Stripe checkout
- `POST /api/account/portal` - Customer portal

## Auto-Updates

The app checks for updates on launch using electron-updater:

1. App queries Cloudflare Worker for latest version
2. Worker serves update feed from R2
3. electron-updater downloads and verifies
4. User prompted to install update

## Database Schema

### Collections

**runs:**
```typescript
{
  id: string;
  prompt: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  mode: 'local' | 'remote';
  createdAt: string;
  updatedAt: string;
  receipts: ExecutionReceipt[];
  output?: string;
  error?: string;
}
```

**receipts:**
```typescript
{
  id: string;
  runId: string;
  timestamp: string;
  action: string;
  status: 'success' | 'error';
  output?: string;
  proof: { hash: string; signature?: string; }
}
```

## Testing

### Manual Testing

1. Start the app: `yarn dev`
2. Create a new run in the Workbench
3. Monitor execution output and receipts
4. Check Run History for completed runs
5. Test recovery on failed runs

### E2E Testing

For production builds, use Playwright or Spectron:

```bash
# Install test dependencies
yarn add --dev @playwright/test electron

# Run E2E tests
yarn test:e2e
```

## Building & Distribution

### Package for All Platforms

```bash
# macOS
yarn package --mac

# Windows
yarn package --win

# Linux
yarn package --linux

# All platforms
yarn package --mac --win --linux
```

Outputs are in `release/`:
- macOS: `.dmg` and `.zip`
- Windows: `.exe` installer and portable
- Linux: `.AppImage` and `.deb`

### Upload Releases to R2

For self-hosted updates:

```bash
# Upload release files to R2
wrangler r2 object put rinawarp-releases/releases/v0.1.0/RinaWarp-Terminal-Pro-0.1.0.dmg --file ./release/RinaWarp-Terminal-Pro-0.1.0.dmg

# Upload latest.json
wrangler r2 object put rinawarp-releases/releases/latest.json --file ./release/latest.json

# Upload platform-specific YAML feeds
wrangler r2 object put rinawarp-releases/releases/darwin-latest.yml --file ./release/latest-mac.yml
```

## Development Tips

### Hot Reload

- **Renderer**: React hot reload works automatically
- **Main process**: Requires restart (kill and re-run `yarn dev:electron`)

### Debugging

- **Renderer**: Open DevTools (`Cmd+Option+I` on macOS)
- **Main process**: Use `console.log` (appears in terminal)
- **IPC**: Log both sides of communication

### Environment Variables

Create `.env` in project root:

```bash
MONGO_URL=mongodb://localhost:27017
DB_NAME=rinawarp_terminal
NODE_ENV=development
```

## Security

- **Context Isolation**: Enabled (renderer cannot access Node.js directly)
- **Node Integration**: Disabled (secure by default)
- **Preload Script**: Only exposes necessary IPC methods
- **Content Security Policy**: Restricts resource loading

## Performance

- **Database Indexing**: Runs and receipts indexed for fast queries
- **Lazy Loading**: Components load on demand
- **Efficient IPC**: Batch updates where possible
- **Background Execution**: Long tasks run in main process

## Troubleshooting

### App won't start

- Check MongoDB is running
- Verify Node.js version (18+)
- Clear `node_modules` and reinstall

### IPC errors

- Check type contracts in `shared/contracts.ts`
- Verify handler is registered in `electron/ipc/handlers.ts`
- Check preload exposes the method

### Update issues

- Verify Cloudflare Worker is deployed
- Check R2 bucket has release files
- Ensure `package.json` version is correct

## Roadmap

- [ ] Remote agent execution (hosted agentd)
- [ ] Multi-agent coordination
- [ ] Advanced diagnostics and profiling
- [ ] Code editor integration
- [ ] Team collaboration features
- [ ] Cloud sync for runs/receipts

## Contributing

This is a commercial product. For bug reports or feature requests, contact support@rinawarptech.com.

## License

Proprietary - All rights reserved

## Support

For technical support:
- Email: support@rinawarptech.com
- Docs: https://docs.rinawarptech.com
- Discord: https://discord.gg/rinawarp
