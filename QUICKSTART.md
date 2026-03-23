# RinaWarp Terminal Pro - Quick Start Guide

## Prerequisites Checklist

Before running the app, ensure you have:

- [ ] Node.js 18 or higher installed (`node --version`)
- [ ] Yarn 1.22 or higher installed (`yarn --version`)
- [ ] MongoDB installed and accessible
- [ ] Terminal/command line access

## 5-Minute Setup

### Step 1: Install Dependencies (2 min)

```bash
cd /app
yarn install
```

This installs:
- Electron and electron-builder
- TypeScript compiler
- React and dependencies (in renderer/)
- MongoDB driver
- All other packages

### Step 2: Start MongoDB (1 min)

**Option A: If MongoDB is already running**
```bash
# Check if running
pgrep -x "mongod"
# If you see a process ID, you're good to go!
```

**Option B: Start MongoDB manually**
```bash
# Create data directory
mkdir -p ./data/db

# Start MongoDB
mongod --dbpath ./data/db
```

**Option C: Using MongoDB as a service**
```bash
# macOS (Homebrew)
brew services start mongodb-community

# Linux (systemd)
sudo systemctl start mongod

# Windows (Service)
net start MongoDB
```

### Step 3: Build & Run (2 min)

```bash
# Build the main process
yarn build:electron

# Start the app
yarn dev
```

This will:
1. Start React dev server on http://localhost:3000
2. Open Electron desktop window
3. Connect to MongoDB
4. Show the Workbench interface

## First Use

### Create Your First Run

1. **In the Workbench**, you'll see a large text area
2. **Enter a prompt**, for example:
   ```
   Build a simple calculator function that adds two numbers
   ```
3. **Click "Start Run"** (pink button)
4. **Watch the magic**:
   - Execution output appears on the left
   - Receipts generate on the right (with green checkmarks)
   - Each step gets a cryptographic hash proof

### Explore Runs

1. Click **"Runs"** in the sidebar
2. See all your execution history
3. Click any run to see full details and receipts

### Check System Status

1. Click **"Settings"** in the sidebar
2. View agent status (should show "Available")
3. See diagnostics (database stats, active runs, etc.)
4. Check for updates

## Common Issues & Fixes

### "Cannot connect to MongoDB"

**Fix**: Make sure MongoDB is running
```bash
# Check status
pgrep -x "mongod"

# Start MongoDB
mongod --dbpath ./data/db
```

### "Port 3000 already in use"

**Fix**: Kill the process using port 3000
```bash
# Find and kill process
lsof -ti:3000 | xargs kill -9

# Or use a different port
cd renderer
PORT=3001 yarn start
```

### "Electron window doesn't open"

**Fix**: Build the main process first
```bash
yarn build:electron
```

Then try again:
```bash
yarn dev:electron
```

### "TypeScript compilation errors"

**Fix**: Clean and rebuild
```bash
rm -rf dist
yarn build:electron
```

## Development Workflow

### Making Changes

**Frontend changes (renderer/):**
- Edit files in `renderer/src/`
- Changes hot reload automatically
- No restart needed

**Backend changes (electron/):**
- Edit files in `electron/`
- Run `yarn build:electron`
- Restart Electron window (Ctrl+C and `yarn dev:electron`)

### Viewing Logs

**Main process logs:**
- Visible in terminal where you ran `yarn dev`

**Renderer logs:**
- Open DevTools: `Cmd+Option+I` (Mac) or `Ctrl+Shift+I` (Win/Linux)
- Check Console tab

### Database Inspection

```bash
# Connect to MongoDB
mongosh

# Switch to app database
use rinawarp_terminal

# View runs
db.runs.find().pretty()

# View receipts
db.receipts.find().pretty()
```

## Production Build

When you're ready to create a distributable:

```bash
# 1. Build everything
yarn build

# 2. Package for your platform
yarn package

# 3. Find installers in release/
ls -la release/
```

Creates:
- **macOS**: `.dmg` installer and `.zip` portable
- **Windows**: `.exe` installer and portable executable  
- **Linux**: `.AppImage` and `.deb` package

## What You Can Do Now

### 1. Execute Agent Tasks
- Write prompts for builds, tests, deploys
- Monitor real-time execution
- View cryptographic receipts

### 2. Recover Failed Runs
- If a run fails, click "Recover"
- Resumes from last successful checkpoint
- All previous receipts preserved

### 3. Review History
- Browse all past runs
- See complete execution details
- Verify receipt proofs

### 4. Monitor System
- Check agent availability
- View database statistics
- Run diagnostics

## Next Steps

1. **Customize Agent Logic**
   - Edit `electron/agentd/executor.ts`
   - Implement real build/test/deploy commands
   - Add your own task types

2. **Enhance UI**
   - Modify components in `renderer/src/components/`
   - Adjust theme in `renderer/src/App.css`
   - Add new features

3. **Deploy Updates**
   - Set up Cloudflare Worker
   - Upload releases to R2
   - Enable auto-updates

4. **Add Integrations**
   - Connect to real AI agents
   - Integrate with CI/CD tools
   - Add code editor support

## Getting Help

- **Documentation**: See README.md, DEVELOPMENT.md, TESTING.md
- **Code Comments**: Well-documented throughout
- **Architecture**: Check PROJECT_SUMMARY.md
- **Types**: Explore shared/contracts.ts for data structures

## Pro Tips

1. **Use the helper script**: `./scripts/dev.sh` does everything
2. **Check MongoDB first**: Most issues are from MongoDB not running
3. **DevTools are your friend**: Cmd+Option+I for debugging
4. **Read the receipts**: They show exactly what the agent did
5. **Recovery is powerful**: Never lose progress on failed runs

---

**You're all set!** 🚀

Start with `yarn dev` and create your first run.
