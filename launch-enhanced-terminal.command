#!/bin/bash

# 🧜‍♀️ RinaWarp Terminal with Enhanced AI Capabilities
# This launches your beautiful terminal with Warp Agent-like AI assistance

echo "🚀 Launching RinaWarp Terminal with Enhanced AI..."
echo "🧜‍♀️ Your terminal now includes Warp Agent capabilities!"
echo ""

# Change to the terminal directory
cd "$(dirname "$0")"

# Check if we have a local server running
if command -v python3 &> /dev/null; then
    echo "📡 Starting local server..."
python3 -m http.server 8081 --bind :: > /dev/null 2>&1 &
    SERVER_PID=$!
    echo "✅ Server started (PID: $SERVER_PID)"
    
    # Wait a moment for server to start
    sleep 2
    
    # Open in default browser
    echo "🌐 Opening RinaWarp Terminal in browser..."
open "http://localhost:8081"
    
    echo ""
    echo "🧜‍♀️ Your Enhanced RinaWarp Terminal is now open!"
    echo "✨ Look for the 'AI Agent' button in the top-right corner"
    echo "💬 Try asking: 'What can you help me with today?'"
    echo ""
    echo "Press Ctrl+C to stop the server when done..."
    
    # Keep script running
    wait $SERVER_PID
    
elif command -v node &> /dev/null; then
    echo "📡 Starting Node.js server..."
    npx http-server -p 8080 &
    SERVER_PID=$!
    echo "✅ Server started (PID: $SERVER_PID)"
    
    sleep 2
    open "http://localhost:8080"
    
    echo ""
    echo "🧜‍♀️ Your Enhanced RinaWarp Terminal is now open!"
    echo "✨ Look for the 'AI Agent' button in the top-right corner" 
    echo "💬 Try asking: 'What can you help me with today?'"
    echo ""
    echo "Press Ctrl+C to stop the server when done..."
    
    wait $SERVER_PID
else
    # Fallback - just open the file directly
    echo "🌐 Opening terminal directly in browser..."
    open "index.html"
    echo "✅ RinaWarp Terminal opened!"
    echo "🧜‍♀️ Enhanced AI capabilities are now active!"
fi

echo ""
echo "🌊 Thanks for using RinaWarp Terminal with Enhanced AI!"
