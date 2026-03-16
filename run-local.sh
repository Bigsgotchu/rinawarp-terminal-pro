#!/bin/bash
# run-local.sh - Complete setup for RinaWarp Terminal Pro
# Upgrades Node, fixes dependencies, rebuilds Electron, starts daemon, launches app

set -e

echo "🚀 Starting RinaWarp Terminal Pro Local Setup..."

# 1️⃣ Ensure correct Node version (>=18.19)
echo "📦 Checking Node version..."
if command -v nvm >/dev/null 2>&1; then
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
fi

# Install and use Node 18.19 if needed
if command -v nvm >/dev/null 2>&1; then
    nvm install 18.19 || true
    nvm use 18.19 || true
fi

NODE_VERSION=$(node -v)
echo "🔹 Node version: $NODE_VERSION (must be >= 18.19.0)"

# 2️⃣ Go to project root
PROJECT_ROOT="$HOME/Documents/rinawarp-terminal-pro"
cd "$PROJECT_ROOT"
echo "📂 Project root: $PROJECT_ROOT"

# 3️⃣ Update terminal dependencies (xterm + fit addon)
echo "📦 Updating xterm dependencies..."
cd apps/terminal-pro
pnpm add xterm@6.4.0 xterm-addon-fit@0.11.0
cd ../../

# 4️⃣ Install workspace dependencies
echo "📦 Installing workspace dependencies..."
pnpm install --shamefully-hoist

# 5️⃣ Clean previous builds
echo "🧹 Cleaning previous builds..."
npm run clean || true

# 6️⃣ Build Electron & preload scripts
echo "🛠 Building Electron & preload..."
pnpm run build

# 7️⃣ Start the daemon
echo "⚡ Starting Agent Daemon..."
pnpm run agent:daemon:start

# Wait for daemon to initialize
sleep 2

# 8️⃣ Verify daemon is running
echo "ℹ️ Daemon status:"
pnpm run agent:daemon:status

# 9️⃣ Launch the Terminal Pro Electron app
echo "💻 Launching Electron..."
pnpm run dev:terminal

# ✅ Optional: Set fake POSTHOG API key to suppress analytics errors
export POSTHOG_API_KEY="test"

echo "✅ Setup complete. Terminal should be ready."
