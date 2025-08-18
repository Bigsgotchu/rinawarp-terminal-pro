#!/bin/bash

# 🚀 RinaWarp Terminal Creator Edition - Standalone Desktop Launcher
# Advanced AI-Integrated Desktop Terminal Application

echo "🌟 Launching RinaWarp Terminal Creator Edition (Desktop App)..."
echo "🧜‍♀️ Advanced AI Terminal - Standalone Desktop Application"
echo "✨ Featuring: AI Integration, Security, Modular Architecture"
echo ""

# Navigate to app directory
cd "$(dirname "$0")"

# Check if Electron is installed
if command -v electron &> /dev/null; then
    echo "📱 Starting RinaWarp Desktop Application with Electron..."
    
    # Check if dependencies are installed
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing dependencies..."
        npm install
        echo "✅ Dependencies installed"
    fi
    
    # Launch the Electron app
    echo "🚀 Launching RinaWarp Terminal Creator Edition..."
    electron . --disable-gpu-sandbox --no-sandbox 2>/dev/null
    
elif command -v npm &> /dev/null; then
    echo "📦 Electron not found globally, installing dependencies..."
    
    # Install dependencies including Electron
    npm install
    
    echo "🚀 Launching RinaWarp Terminal Creator Edition..."
    npm start
    
else
    echo "❌ Node.js and npm are required to run RinaWarp Terminal Creator Edition"
    echo ""
    echo "Please install Node.js from https://nodejs.org/"
    echo "Then run this launcher again."
    echo ""
    exit 1
fi

echo ""
echo "🌊 Thank you for using RinaWarp Terminal Creator Edition!"
echo "🎯 Advanced AI Terminal for Creators & Developers"
