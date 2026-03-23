# RinaWarp Terminal Pro - Development Guide

## Quick Start

```bash
# 1. Install dependencies
yarn install

# 2. Start MongoDB
mongod

# 3. Run in development mode
yarn dev
```

## Development Workflow

### 1. Frontend Development (Renderer)

The renderer is a standard React app with Tailwind and Shadcn/UI:

```bash
cd renderer
yarn start  # Starts on http://localhost:3000
```

**UI Components**: Located in `renderer/src/components/ui/`
**Main Components**:
- `Workbench.js` - Agent execution interface
- `RunsList.js` - Run history
- `Settings.js` - Settings and diagnostics

**Styling**:
- Dark theme: Near-black (#0a0a0a) base
- Action accent: Pink/coral (#ff5a78)
- Trust/proof accent: Teal (#4dd4d4)
- Font: Inter (body), Fira Sans (headings)

### 2. Backend Development (Main Process)

The main process is TypeScript Node.js:

```bash
# Compile TypeScript
yarn build:electron

# Run Electron
yarn dev:electron
```

**Key Modules**:
- `electron/main.ts` - Entry point
- `electron/agentd/` - Agent orchestration
- `electron/ipc/` - IPC handlers
- `electron/store/` - Database layer

### 3. Adding New Features

#### Adding a New IPC Method

1. **Define contract** in `shared/contracts.ts`:
```typescript
export const IPC_CHANNELS = {
  // ...
  MY_NEW_CHANNEL: 'my:new:channel',
};
```

2. **Add handler** in `electron/ipc/handlers.ts`:
```typescript
ipcMain.handle(IPC_CHANNELS.MY_NEW_CHANNEL, async (_event, data) => {
  // Implementation
  return { success: true, data: result };
});
```

3. **Expose in preload** (if needed) in `electron/preload.ts`:
```typescript
contextBridge.exposeInMainWorld('electronAPI', {
  myFeature: {
    doSomething: (arg) => ipcRenderer.invoke(IPC_CHANNELS.MY_NEW_CHANNEL, arg),
  },
});
```

4. **Use in renderer**:
```typescript
const response = await window.electronAPI.myFeature.doSomething(arg);
```

#### Adding a New UI Component

1. Create component in `renderer/src/components/`
2. Import and use in route or parent component
3. Use existing Shadcn components from `ui/`
4. Follow dark theme guidelines

### 4. Database Operations

All database operations go through `DataStore` in `electron/store/datastore.ts`:

```typescript
// Save a run
await dataStore.saveRun(run);

// Query runs
const runs = await dataStore.getRuns({ status: 'completed' });

// Save receipt
await dataStore.saveReceipt(receipt);
```

### 5. Testing

#### Manual Testing

1. Start app: `yarn dev`
2. Create run in Workbench
3. Monitor execution and receipts
4. Check Settings for diagnostics
5. Verify database in MongoDB

#### Automated Testing

For E2E tests, use Playwright:

```bash
# Install
yarn add --dev @playwright/test

# Run tests
yarn test:e2e
```

### 6. Debugging

#### Renderer Process

Open DevTools: `Cmd+Option+I` (macOS) or `Ctrl+Shift+I` (Windows/Linux)

Or programmatically:
```typescript
mainWindow.webContents.openDevTools();
```

#### Main Process

Use VS Code debugger:

1. Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Electron Main",
  "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron",
  "program": "${workspaceFolder}/dist/electron/main.js",
  "protocol": "inspector"
}
```

2. Set breakpoints in TypeScript files
3. Run debugger

#### IPC Communication

Log both sides:

```typescript
// Main process
ipcMain.handle('run:create', async (_event, data) => {
  console.log('[IPC] run:create request:', data);
  const result = await orchestrator.createRun(data.prompt);
  console.log('[IPC] run:create response:', result);
  return { success: true, data: result };
});

// Renderer
const response = await window.electronAPI.runs.create(prompt);
console.log('[IPC] response:', response);
```

### 7. Building

#### Development Build

```bash
yarn build  # Builds renderer + main
```

#### Production Build

```bash
yarn build
yarn package  # Creates distributable
```

Outputs in `release/`:
- macOS: `.dmg`, `.zip`
- Windows: `.exe`, portable
- Linux: `.AppImage`, `.deb`

### 8. Cloudflare Worker Development

```bash
cd cloudflare-worker

# Install dependencies
yarn install

# Run local dev server
yarn dev  # Starts on http://localhost:8787

# Deploy to Cloudflare
yarn deploy
```

Test endpoints:
```bash
# Health check
curl http://localhost:8787/api/health

# Latest version
curl http://localhost:8787/api/updates/latest
```

## Architecture Deep Dive

### IPC Flow

```
Renderer (React)     Preload (Bridge)     Main (Node)
     |                      |                   |
     | invoke('run:create') |                   |
     |--------------------->|                   |
     |                      | handle()          |
     |                      |------------------>|
     |                      |                   | orchestrator.createRun()
     |                      |                   |
     |                      |    { data }       |
     |      response        |<------------------|
     |<---------------------|                   |
     |                      |                   |
```

### Agent Execution Flow

```
1. User submits prompt (Workbench)
   ↓
2. IPC call to main process
   ↓
3. Orchestrator creates run
   ↓
4. Executor starts execution
   ↓
5. For each step:
   - Execute action
   - Generate receipt
   - Save to database
   - Emit progress event
   ↓
6. Run completes/fails
   ↓
7. Update UI via IPC events
```

### Receipt Generation

```typescript
// 1. Action occurs
const action = 'execution:compile';
const output = 'Compiled successfully';

// 2. Create receipt data
const data = {
  id: uuid(),
  runId: run.id,
  timestamp: new Date().toISOString(),
  action,
  status: 'success',
  output,
};

// 3. Generate proof hash
const hash = crypto
  .createHash('sha256')
  .update(JSON.stringify(data))
  .digest('hex');

// 4. Create receipt
const receipt = { ...data, proof: { hash } };

// 5. Save and emit
await dataStore.saveReceipt(receipt);
orchestrator.emit('run:receipt', { runId, receipt });
```

## Best Practices

### 1. Type Safety

- Always define types in `shared/contracts.ts`
- Use TypeScript strict mode
- Validate IPC data

### 2. Error Handling

```typescript
try {
  const result = await operation();
  return { success: true, data: result };
} catch (error: any) {
  console.error('[Module] Error:', error);
  return { success: false, error: error.message };
}
```

### 3. Database Queries

- Always exclude `_id` in projections
- Use indexes for frequent queries
- Limit result sets

### 4. UI Updates

- Use IPC events for real-time updates
- Debounce rapid updates
- Show loading states

### 5. Security

- Never disable context isolation
- Validate all IPC inputs
- Use prepared statements for queries
- Sanitize user input

## Common Tasks

### Add a New Agent Task Type

1. Update `parseTaskType()` in `executor.ts`
2. Add planning logic in `planExecution()`
3. Implement execution steps
4. Update UI to display task-specific info

### Add a New Page/Route

1. Create component in `renderer/src/components/`
2. Add route in `App.js`
3. Add navigation link in `Sidebar.js`

### Modify Database Schema

1. Update types in `shared/contracts.ts`
2. Update DataStore methods in `datastore.ts`
3. Create migration script if needed
4. Update UI components

### Add Cloudflare Endpoint

1. Add route handler in `cloudflare-worker/worker.ts`
2. Update README with endpoint docs
3. Test locally with `yarn dev`
4. Deploy with `yarn deploy`

## Troubleshooting

### "Cannot find module" errors

```bash
# Clear and reinstall
rm -rf node_modules renderer/node_modules
yarn install
```

### MongoDB connection errors

```bash
# Check MongoDB is running
mongosh  # Should connect

# Or start MongoDB
mongod --dbpath /path/to/data
```

### Electron won't start

```bash
# Rebuild native modules
cd node_modules/electron
node install.js
```

### IPC not working

- Check channel names match exactly
- Verify handler is registered before window loads
- Ensure preload script is loaded
- Check DevTools console for errors

### Build failures

```bash
# Clean build artifacts
rm -rf dist release

# Rebuild TypeScript
yarn build:electron

# Check for TypeScript errors
tsc --noEmit
```

## Performance Tips

1. **Lazy load components**: Use React.lazy() for routes
2. **Memoize expensive renders**: Use React.memo()
3. **Debounce IPC calls**: Avoid rapid-fire requests
4. **Index database queries**: Add indexes for common filters
5. **Batch UI updates**: Collect multiple changes, update once

## Resources

- [Electron Docs](https://www.electronjs.org/docs)
- [electron-builder](https://www.electron.build/)
- [electron-updater](https://www.electron.build/auto-update)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [R2 Storage](https://developers.cloudflare.com/r2/)
