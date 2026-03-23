# RinaWarp Terminal Pro - Testing Guide

## Overview

This document describes how to test RinaWarp Terminal Pro locally and in production.

## Prerequisites

- MongoDB running on localhost:27017
- Node.js 18+
- Yarn 1.22+

## Local Testing

### 1. Setup

```bash
# Clone and install
git clone <repo>
cd rinawarp-terminal-pro
yarn install

# Start MongoDB
mongod --dbpath ./data/db

# Create .env file
cp .env.example .env
```

### 2. Development Mode

```bash
# Option 1: Use helper script
./scripts/dev.sh

# Option 2: Manual
yarn build:electron  # Build main process
yarn dev             # Start renderer + electron
```

The app will:
1. Start React dev server on http://localhost:3000
2. Open Electron window
3. Connect to MongoDB

### 3. Manual Testing Checklist

#### Workbench
- [ ] Enter prompt and start run
- [ ] Verify execution output appears
- [ ] Verify receipts generate in real-time
- [ ] Check receipts have valid hashes
- [ ] Cancel a running task
- [ ] Start a task that will fail
- [ ] Use recovery on failed task

#### Run History
- [ ] View list of all runs
- [ ] Click a run to see details
- [ ] Verify receipts display correctly
- [ ] Check timestamps are accurate
- [ ] Filter by status (if implemented)

#### Settings
- [ ] Agent status shows "Available"
- [ ] Diagnostics load correctly
- [ ] Check for updates button works
- [ ] Database stats are accurate

#### Navigation
- [ ] Sidebar navigation works
- [ ] Agent status badge updates
- [ ] Update notification appears (if available)

### 4. Database Verification

```bash
# Connect to MongoDB
mongosh

# Switch to app database
use rinawarp_terminal

# Check runs
db.runs.find().pretty()

# Check receipts
db.receipts.find().pretty()

# Verify indexes
db.runs.getIndexes()
db.receipts.getIndexes()
```

### 5. IPC Testing

Open DevTools in Electron (Cmd+Option+I) and check console:

```javascript
// Test run creation
await window.electronAPI.runs.create('Test task', 'local')

// Test agent status
await window.electronAPI.agent.status()

// Test diagnostic
await window.electronAPI.agent.diagnostic()
```

## Production Build Testing

### 1. Build

```bash
yarn build
yarn package
```

### 2. Test Installer

#### macOS
```bash
# Install from DMG
open release/RinaWarp-Terminal-Pro-0.1.0.dmg

# Or run portable
open release/mac/RinaWarp\ Terminal\ Pro.app
```

#### Windows
```bash
# Run installer
release/RinaWarp-Terminal-Pro-Setup-0.1.0.exe

# Or portable
release/RinaWarp-Terminal-Pro-0.1.0-portable.exe
```

#### Linux
```bash
# AppImage
chmod +x release/RinaWarp-Terminal-Pro-0.1.0.AppImage
./release/RinaWarp-Terminal-Pro-0.1.0.AppImage

# Or install .deb
sudo dpkg -i release/rinawarp-terminal-pro_0.1.0_amd64.deb
```

### 3. Production Checklist

- [ ] App launches without errors
- [ ] MongoDB connection works
- [ ] All features function correctly
- [ ] Update check works (if server deployed)
- [ ] No console errors
- [ ] Performance is acceptable
- [ ] Memory usage is reasonable

## Cloudflare Worker Testing

### 1. Local Development

```bash
cd cloudflare-worker
yarn dev
```

Test endpoints:

```bash
# Health check
curl http://localhost:8787/api/health

# Latest version
curl http://localhost:8787/api/updates/latest

# Update feed
curl http://localhost:8787/api/updates/darwin
```

### 2. Production Testing

After deploying to Cloudflare:

```bash
# Health check
curl https://updates.rinawarptech.com/api/health

# Latest version
curl https://updates.rinawarptech.com/api/updates/latest

# Download
curl -I https://updates.rinawarptech.com/download/v0.1.0/RinaWarp-Terminal-Pro-0.1.0.dmg
```

## E2E Testing with Playwright

### Setup

```bash
yarn add --dev @playwright/test electron
```

### Example Test

```typescript
// tests/e2e/workbench.spec.ts
import { test, expect, _electron as electron } from '@playwright/test';

test('create and execute run', async () => {
  const app = await electron.launch({
    args: ['dist/electron/main.js'],
  });

  const window = await app.firstWindow();

  // Navigate to workbench
  await window.goto('/');

  // Enter prompt
  await window.fill('[data-testid="prompt-input"]', 'Test task');

  // Start run
  await window.click('[data-testid="start-run-button"]');

  // Wait for execution
  await window.waitForSelector('[data-testid="run-status-badge"]');

  // Check receipts appear
  const receipts = await window.locator('[data-testid^="receipt-"]');
  await expect(receipts).not.toHaveCount(0);

  await app.close();
});
```

Run tests:

```bash
yarn test:e2e
```

## Performance Testing

### 1. Memory Profiling

```bash
# Start with memory profiling
electron --inspect dist/electron/main.js

# Open chrome://inspect in Chrome
# Take heap snapshots before/after operations
```

### 2. Load Testing

Create multiple runs simultaneously:

```javascript
// In DevTools console
const promises = [];
for (let i = 0; i < 10; i++) {
  promises.push(
    window.electronAPI.runs.create(`Test run ${i}`, 'local')
  );
}
await Promise.all(promises);
```

### 3. Database Performance

```javascript
// Check query performance
db.runs.find().explain('executionStats')

// Monitor slow queries
db.setProfilingLevel(2)
db.system.profile.find().pretty()
```

## Security Testing

### 1. Context Isolation

Verify in DevTools:

```javascript
// Should be undefined (no direct Node access)
console.log(typeof require);  // undefined
console.log(typeof process);   // undefined

// Should be defined (safe API)
console.log(typeof window.electronAPI);  // object
```

### 2. IPC Validation

Test malformed requests:

```javascript
// Should handle gracefully
await window.electronAPI.runs.create(null);
await window.electronAPI.runs.get('invalid-id');
```

### 3. CSP Headers

Check Content Security Policy in Network tab:

```
Content-Security-Policy: default-src 'self'; ...
```

## Troubleshooting Tests

### MongoDB Not Connected

```bash
# Check MongoDB status
pgrep -x "mongod"

# Start MongoDB
mongod --dbpath ./data/db

# Check connection in app logs
```

### IPC Timeouts

- Check main process logs in terminal
- Verify handlers are registered
- Check for errors in preload script

### Build Failures

```bash
# Clean build
rm -rf dist release node_modules renderer/node_modules
yarn install
yarn build
```

### Electron Won't Launch

```bash
# Check Electron installation
node_modules/.bin/electron --version

# Rebuild native modules
cd node_modules/electron && node install.js
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - name: Install dependencies
        run: yarn install
      
      - name: Start MongoDB
        uses: supercharge/mongodb-github-action@1.9.0
      
      - name: Build
        run: yarn build
      
      - name: Test
        run: yarn test:e2e
      
      - name: Package
        run: yarn package
```

## Reporting Issues

When reporting bugs, include:

1. **Steps to reproduce**
2. **Expected behavior**
3. **Actual behavior**
4. **Screenshots** (if UI issue)
5. **Logs**:
   - Main process logs (terminal)
   - Renderer logs (DevTools console)
   - MongoDB logs
6. **Environment**:
   - OS and version
   - Node.js version
   - MongoDB version
   - App version

## Test Coverage Goals

- [ ] 80%+ code coverage for critical paths
- [ ] All IPC handlers have tests
- [ ] Database operations tested
- [ ] UI components have integration tests
- [ ] E2E tests for main workflows
- [ ] Performance benchmarks established
