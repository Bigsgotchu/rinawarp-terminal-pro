# RinaWarp Terminal Agent Mode

## Overview

RinaWarp Terminal Agent Mode is an advanced AI-powered assistant that integrates directly into the terminal environment, providing intelligent automation, command execution, and development assistance. Similar to modern AI coding assistants like Cursor Agent Mode, it combines the power of large language models with function calling capabilities to provide a seamless, interactive terminal experience.

## ✨ Features

### 🤖 Intelligent AI Assistant
- **Natural Language Processing**: Chat with Rina in natural language
- **Context Awareness**: Maintains conversation history and understands terminal context
- **Multiple AI Providers**: Supports OpenAI GPT, Anthropic Claude, and local Ollama models

### 🔧 Function Calling Capabilities
- **Command Execution**: Safely execute shell commands with confirmation
- **File Operations**: Read, write, and manage files
- **Git Integration**: Repository management and version control
- **System Monitoring**: Check system resources and processes
- **Directory Operations**: Navigate and manage file systems
- **Search Functionality**: Find files and search content

### 🛡️ Safety & Security
- **Command Validation**: Automatic detection of dangerous operations
- **User Confirmation**: Prompts for potentially harmful actions
- **Risk Assessment**: Categorizes functions by risk level
- **Session Management**: Isolated conversation sessions

### 🌐 Multi-Provider Support
- **OpenAI**: GPT-4 Turbo, GPT-4, GPT-3.5 Turbo
- **Anthropic**: Claude 3 Opus, Sonnet, Haiku
- **Ollama**: Local models (Llama 2, CodeLlama, Mistral)

## 🚀 Getting Started

### Prerequisites
- RinaWarp Terminal installed and running
- Optional: AI provider API keys (OpenAI, Anthropic)
- Optional: Ollama for local models

### Basic Usage

1. **Start Agent Mode**:
   ```bash
   agent start
   ```

2. **Chat with Rina**:
   ```bash
   rina help me list all JavaScript files in this project
   ```

3. **Direct Agent Commands**:
   ```bash
   agent analyze my project structure
   ```

4. **Check Status**:
   ```bash
   agent status
   ```

5. **Stop Agent Mode**:
   ```bash
   agent stop
   ```

## 📚 Available Commands

### Control Commands
- `agent start` - Activate Agent Mode
- `agent stop` - Deactivate Agent Mode
- `agent status` - Show current status
- `agent help` - Display help information

### Interaction Commands
- `agent <message>` - Chat with the AI agent
- `rina <message>` - Direct chat with Rina

### Information Commands
- `agent functions` - List available functions
- `agent config` - Show configuration
- `agent clear` - Clear conversation history
- `agent export` - Export conversation to file

## 🔧 Available Functions

The Agent Mode provides several built-in functions that the AI can use:

### Terminal Operations
- **execute_command**: Execute shell commands safely
  - Risk Level: Medium
  - Requires confirmation for dangerous operations

### File Management
- **read_file**: Read file contents
  - Risk Level: Low
  - Supports line range reading
- **write_file**: Create or modify files
  - Risk Level: High
  - Requires confirmation
- **list_directory**: List directory contents
  - Risk Level: Low

### Search Operations
- **search_files**: Search for text patterns in files
  - Risk Level: Low
  - Supports regex patterns and file filtering

### Git Operations
- **git_status**: Get repository status
  - Risk Level: Low
  - Shows branch and file changes

### System Information
- **get_system_info**: Retrieve system information
  - Risk Level: Low
  - Includes memory, processes, platform details

## 🌐 API Endpoints

The Agent Mode exposes several API endpoints for integration:

### Configuration
- `GET /api/ai/agent/config` - Get agent configuration
- `POST /api/ai/agent/config` - Update configuration

### Functions
- `GET /api/ai/agent/functions` - List available functions
- `POST /api/ai/agent/functions/register` - Register custom function

### Sessions
- `POST /api/ai/agent/session/start` - Start new session
- `POST /api/ai/agent/session/end` - End session
- `GET /api/ai/agent/session/:id` - Get session info

### Chat
- `POST /api/ai/agent-chat` - Send chat message with AI

### Health
- `GET /api/ai/agent/health` - Check system health

## ⚙️ Configuration

### Environment Variables

```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Anthropic Configuration  
ANTHROPIC_API_KEY=your_anthropic_api_key

# Ollama Configuration (for local models)
OLLAMA_ENDPOINT=http://localhost:11434
```

### Agent Settings

The agent can be configured with various settings:

```javascript
{
  "model": "gpt-4-turbo",           // AI model to use
  "temperature": 0.3,               // Response creativity (0-2)
  "maxTokens": 4096,               // Maximum response length
  "provider": "openai",            // AI provider
  "enableFunctionCalling": true,   // Enable function execution
  "confirmDangerous": true,        // Confirm risky operations
  "contextWindow": 50              // Conversation history length
}
```

## 🎯 Use Cases

### Development Assistance
```bash
rina analyze this error message and suggest a fix
rina refactor this function to use async/await
rina find all TODO comments in my codebase
```

### System Administration
```bash
rina check disk space and show largest directories
rina monitor system processes and show top CPU usage
rina backup my project to a tar archive
```

### Git & Version Control
```bash
rina show me what files have changed since last commit
rina create a new branch for this feature
rina help me resolve merge conflicts
```

### File Management
```bash
rina organize these files by type into separate folders
rina find all large files over 100MB
rina clean up old log files older than 30 days
```

### Project Analysis
```bash
rina analyze my package.json and suggest optimizations
rina audit my dependencies for security issues
rina generate documentation for this API
```

## 🛡️ Safety Features

### Command Validation
The agent automatically detects and flags dangerous commands:
- File system destructive operations (`rm -rf /`)
- System shutdown commands
- Disk formatting operations
- Privilege escalation attempts

### Confirmation System
High-risk operations require explicit user confirmation:
```
🚨 The AI wants to execute: write_file
Description: Write content to a file
Arguments: {
  "path": "/important/config.txt",
  "content": "...",
  "mode": "overwrite"
}

Confirm? (y/N):
```

### Session Isolation
Each agent session is isolated:
- Separate conversation history
- Independent context tracking
- Session-specific configuration

## 🔍 Advanced Features

### Context Awareness
The agent maintains awareness of:
- Current working directory
- Recent command history
- Git repository status
- System environment
- File structure

### Conversation Export
Export conversations for review:
```bash
agent export
# Creates: agent-conversation-[timestamp].json
```

### Custom Functions
Developers can register custom functions via the API:
```javascript
POST /api/ai/agent/functions/register
{
  "name": "deploy_app",
  "description": "Deploy application to production",
  "parameters": {
    "type": "object",
    "properties": {
      "environment": {"type": "string"}
    }
  },
  "category": "deployment",
  "riskLevel": "high"
}
```

## 🚨 Limitations & Considerations

### API Rate Limits
- OpenAI: Varies by plan
- Anthropic: Varies by plan  
- Ollama: Local processing only

### Function Execution
- Commands run in current user context
- No privilege escalation
- File system access limited to user permissions

### Security
- Always validate AI-generated commands
- Review file modifications before execution
- Monitor resource usage for local models

## 🐛 Troubleshooting

### Common Issues

**Agent won't start**:
```bash
# Check if API keys are configured
agent config

# Verify health status
curl https://rinawarptech.com/api/ai/agent/health
```

**Function calls failing**:
- Check user permissions
- Verify working directory
- Review command syntax

**Poor AI responses**:
- Try different temperature settings
- Switch AI providers
- Provide more context in prompts

### Debug Mode
Enable verbose logging:
```bash
DEBUG=agent:* agent start
```

## 🤝 Contributing

The Agent Mode is extensible and welcomes contributions:

1. **Custom Functions**: Add domain-specific functions
2. **AI Providers**: Integrate new AI services
3. **Safety Rules**: Enhance command validation
4. **UI Improvements**: Better terminal interface

## 📄 License

RinaWarp Terminal Agent Mode is part of RinaWarp Terminal and follows the same licensing terms.

---

## 🌊 Ready to Ride the Wave?

Agent Mode transforms your terminal into an intelligent development environment. Start with simple commands and gradually explore advanced features as you become comfortable with AI-assisted terminal operations.

**Example Session**:
```bash
$ agent start
🤖 Agent Mode Activated

I'm Rina, your AI terminal assistant. I can help you with:
• Command execution - Run shell commands safely
• File operations - Read, write, and manage files  
• Code analysis - Review and improve your code
...

$ rina help me analyze my JavaScript project structure
🤔 Thinking...

🤖 Rina:
──────────────────────────────────────────────────
I'll help you analyze your JavaScript project structure. Let me start by examining your current directory and looking for key files.

🔧 Actions Performed:
✓ list_directory
   Output: total 48
   drwxr-xr-x  12 user staff  384 Jul 26 00:45 .
   drwxr-xr-x   8 user staff  256 Jul 26 00:30 ..
   -rw-r--r--   1 user staff 1234 Jul 26 00:45 package.json
   drwxr-xr-x   5 user staff  160 Jul 26 00:44 src
   ...

Based on your project structure, I can see you have:
- A Node.js project with package.json
- Source code in /src directory
- Multiple configuration files

Would you like me to analyze your dependencies, examine the src structure, or look at specific files?

📊 Tokens: 234 | Model: gpt-4-turbo
──────────────────────────────────────────────────

$ 
```

The future of terminal interaction is here. Welcome to Agent Mode! 🚀
