#!/bin/bash

# 🧜‍♀️ RinaWarp Terminal Launcher
# Opens the actual terminal application, not the marketing website

echo "🚀 Launching RinaWarp Terminal..."
echo "🧜‍♀️ Your AI-powered terminal is starting up!"
echo ""

# Change to the terminal directory
cd "$(dirname "$0")"

# Check if we have a local server running
if command -v python3 &> /dev/null; then
    echo "📡 Starting local server for terminal..."
    python3 -m http.server 8082 --bind :: > /dev/null 2>&1 &
    SERVER_PID=$!
    echo "✅ Server started (PID: $SERVER_PID)"
    
    # Wait a moment for server to start
    sleep 2
    
    # Open the actual terminal interface
    echo "🌐 Opening RinaWarp Terminal interface..."
    open "http://localhost:8082/src/terminal-working.html"
    
    echo ""
    echo "🧜‍♀️ Your RinaWarp Terminal is now open!"
    echo "✨ The AI assistant is ready to help you"
    echo "💬 Type commands directly or ask for help"
    echo ""
    echo "Press Ctrl+C to stop the server when done..."
    
    # Keep script running
    wait $SERVER_PID
    
elif command -v node &> /dev/null; then
    echo "📡 Starting Node.js server..."
    npx http-server -p 8082 &
    SERVER_PID=$!
    echo "✅ Server started (PID: $SERVER_PID)"
    
    sleep 2
    open "http://localhost:8082/src/terminal-working.html"
    
    echo ""
    echo "🧜‍♀️ Your RinaWarp Terminal is now open!"
    echo "✨ The AI assistant is ready to help you" 
    echo "💬 Type commands directly or ask for help"
    echo ""
    echo "Press Ctrl+C to stop the server when done..."
    
    wait $SERVER_PID
else
    # Fallback - just open the file directly
    echo "🌐 Opening terminal directly in browser..."
    open "src/terminal-working.html"
    echo "✅ RinaWarp Terminal opened!"
    echo "🧜‍♀️ AI capabilities are now active!"
fi

echo ""
echo "🌊 Thanks for using RinaWarp Terminal!"
