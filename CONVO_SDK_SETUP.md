# RinaWarp Terminal - Convo SDK Integration Setup Guide

## 🎯 Overview

This guide will help you integrate **Convo SDK** into RinaWarp Terminal to add powerful persistence, memory management, and time-travel debugging capabilities to your AI interactions.

## 🌟 What You'll Get

After completing this setup, your terminal will have:

- **🧠 Persistent Memory**: AI conversations survive across terminal sessions
- **⏰ Time-Travel Debugging**: Go back to any previous AI interaction
- **🧵 Multi-User Threads**: Manage multiple conversation contexts
- **📊 Advanced Analytics**: Track AI performance and usage
- **🔄 Checkpoint System**: Save and restore AI conversation states
- **📚 Conversation History**: Full searchable interaction logs

## 📋 Prerequisites

- Node.js 20+ and npm 9+
- RinaWarp Terminal installed and working
- A Convo API key (get one from [Convo website](https://convo.dev))

## 🚀 Installation Steps

### 1. Convo SDK Package

The Convo SDK package is already installed in your project:

```bash
npm list convo-sdk
# Should show: convo-sdk@1.0.47
```

### 2. Get Your Convo API Key

1. Visit the [Convo website](https://convo.dev)
2. Sign up for an account
3. Navigate to your dashboard
4. Copy your API key

### 3. Configure Environment Variables

Add your Convo API key to your environment:

```bash
# Option 1: Add to your .env file
echo "CONVO_API_KEY=your_convo_api_key_here" >> .env

# Option 2: Export in your shell profile
echo "export CONVO_API_KEY=your_convo_api_key_here" >> ~/.zshrc
source ~/.zshrc
```

### 4. Test the Integration

Run the health check to verify everything is working:

```bash
npm run convo:health
```

You should see output like:
```
🏥 Performing health check...

📊 Health Status:
   Overall: HEALTHY
   Provider: openai
   Latency: 234ms

🧠 Convo Features:
   Persistence: AVAILABLE
   Time Travel: AVAILABLE
   Thread: thread_1234567890_abcdef
```

### 5. Initialize the System

Initialize Convo SDK integration:

```bash
npm run convo:init
```

## 🔧 Available Commands

### Quick Commands
- `npm run convo:init` - Initialize Convo SDK
- `npm run convo:test` - Run full integration test
- `npm run convo:health` - Check system health
- `npm run convo:debug` - Show debug information
- `npm run convo:chat` - Test chat functionality

### Full CLI Access
For advanced usage, use the full CLI:

```bash
# Show all available commands
npm run test:convo help

# Initialize and test
npm run test:convo init
npm run test:convo test

# Chat with AI
npm run test:convo chat "Hello, how are you?"

# Explain commands
npm run test:convo explain "git status"

# Suggest commands
npm run test:convo suggest "list all JavaScript files"

# Thread management
npm run test:convo threads
npm run test:convo create-thread "My Project Thread"
npm run test:convo switch-thread thread_123

# Time travel debugging
npm run test:convo history 10
npm run test:convo time-travel 5

# Configuration
npm run test:convo config
npm run test:convo set-config enableTimeTravel true
```

## ⚙️ Configuration Options

You can customize the integration behavior:

### Environment Variables

```bash
# Core settings
CONVO_API_KEY=your_api_key_here
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here

# Advanced settings (optional)
CONVO_ENABLE_PERSISTENCE=true
CONVO_ENABLE_TIME_TRAVEL=true
CONVO_CHECKPOINT_INTERVAL=5
```

### Configuration Commands

```bash
# Enable/disable features
npm run test:convo set-config enablePersistence true
npm run test:convo set-config enableTimeTravel true

# Adjust AI settings
npm run test:convo set-config temperature 0.7
npm run test:convo set-config maxTokens 2048

# Set preferred provider
npm run test:convo set-config preferredProvider openai
```

## 🧵 Thread Management

Threads allow you to maintain separate conversation contexts:

```bash
# List all threads
npm run test:convo threads

# Create a new thread
npm run test:convo create-thread "Debug Session"

# Switch between threads
npm run test:convo switch-thread thread_abc123

# Each thread maintains its own:
# - Conversation history
# - Context and memory
# - Checkpoints for time travel
```

## ⏰ Time Travel Debugging

Debug AI interactions by going back in time:

```bash
# Show recent interactions
npm run test:convo history 10

# Time travel to a specific interaction
npm run test:convo time-travel 3

# This restores the AI system to that exact state:
# - Previous conversation context
# - System state and variables
# - AI provider settings
```

## 🔍 Debugging Issues

### Check System Status

```bash
npm run test:convo debug
```

This shows:
- System initialization status
- Convo SDK connectivity
- AI provider status
- Thread information
- Configuration details

### Common Issues

#### 1. "Convo API key not found"
```bash
# Check if key is set
npm run test:convo config

# If key shows "NOT SET":
echo "CONVO_API_KEY=your_key_here" >> .env
```

#### 2. "Persistence not available"
```bash
# Check health status
npm run convo:health

# Reinitialize
npm run convo:init
```

#### 3. "Time travel not available in fallback mode"
This means Convo SDK isn't properly connected:
- Verify API key is correct
- Check internet connection
- Try reinitializing: `npm run convo:init`

## 📊 Usage Examples

### Basic Chat with Memory
```bash
# Start a conversation
npm run test:convo chat "My name is Alice"

# Later, AI remembers context
npm run test:convo chat "What's my name?"
# Response: "Your name is Alice!"
```

### Command Assistance
```bash
# Get command explanations
npm run test:convo explain "docker ps -a"

# Get command suggestions
npm run test:convo suggest "find all large files"
```

### Multi-Context Workflows
```bash
# Create project-specific threads
npm run test:convo create-thread "Frontend Development"
npm run test:convo create-thread "Backend API"
npm run test:convo create-thread "Database Migration"

# Switch contexts as needed
npm run test:convo switch-thread thread_frontend_123
npm run test:convo chat "How do I optimize React performance?"

npm run test:convo switch-thread thread_backend_456  
npm run test:convo chat "Best practices for REST API design?"
```

## 🔧 Integration with Terminal

The Convo-enhanced AI system automatically integrates with:

- **Terminal AI Assistant**: Your existing AI chat commands now have memory
- **Command Suggestions**: Suggestions improve over time based on usage
- **Error Analysis**: AI learns from your past debugging sessions
- **Context Awareness**: AI understands your project structure over time

## 📈 Performance Features

### Metrics Tracking
The system tracks:
- Response times
- Error rates
- Interaction counts
- Checkpoint usage
- Provider performance

### Optimization
- **Automatic Fallback**: Falls back to local AI if Convo is unavailable
- **Smart Caching**: Reduces API calls through intelligent context management  
- **Checkpoint Batching**: Optimizes storage with configurable intervals

## 🔒 Security & Privacy

### Data Handling
- **Encrypted Storage**: All conversation data is encrypted
- **No Data Retention**: Convo only stores what you explicitly save
- **Direct Connections**: All requests go directly to chosen AI providers
- **Local Fallback**: Works offline with reduced functionality

### Best Practices
- Never commit API keys to version control
- Use environment variables for production
- Rotate API keys periodically
- Monitor usage through provider dashboards

## 🚀 Advanced Usage

### Custom Integrations
The system exposes a JavaScript API for custom integrations:

```javascript
// Access in browser console or custom scripts
const ai = window.RinaWarpAI;

// Chat with memory
const response = await ai.chat("Hello!");

// Create new thread
const thread = await ai.createThread({ name: "My Thread" });

// Time travel
const restored = await ai.timeTravel(5);
```

### Programmatic Access
For Node.js scripts:

```javascript
import { aiIntegrationAdapter } from './src/ai-system/ai-integration-adapter.js';

// Initialize
await aiIntegrationAdapter.initialize();

// Use AI features
const response = await aiIntegrationAdapter.chat("Hello!");
```

## 🎉 What's Next?

Once set up, you can:

1. **Use Natural Commands**: Chat with AI naturally, it remembers context
2. **Debug Intelligently**: Use time travel to understand interaction issues
3. **Organize Workflows**: Use threads for different projects/contexts  
4. **Analyze Performance**: Monitor AI usage and optimize settings
5. **Extend Functionality**: Build custom AI-powered terminal tools

## 📞 Support

If you encounter issues:

1. **Run diagnostics**: `npm run test:convo debug`
2. **Check health**: `npm run convo:health`  
3. **View logs**: Set `DEBUG=1` environment variable
4. **Get help**: `npm run test:convo help`

For advanced support, contact the RinaWarp Terminal team with:
- Debug output from `npm run test:convo debug`
- Your configuration (with API keys redacted)
- Error logs and reproduction steps

## 🏆 Success!

You've successfully integrated Convo SDK into RinaWarp Terminal! Your AI assistant now has:

- **Persistent memory** across sessions
- **Time-travel debugging** capabilities  
- **Multi-thread** conversation management
- **Advanced analytics** and monitoring
- **Seamless fallback** for reliability

Enjoy your enhanced AI-powered terminal experience! 🎊
