# 📖 RinaWarp Terminal User Manual

**Complete user guide for mastering RinaWarp Terminal with AI assistance**

---

## 📋 **Table of Contents**

1. [Getting Started](#getting-started)
2. [AI Commands Reference](#ai-commands-reference)  
3. [Terminal Commands](#terminal-commands)
4. [AI Best Practices](#ai-best-practices)
5. [Advanced Features](#advanced-features)
6. [Settings & Configuration](#settings--configuration)
7. [Keyboard Shortcuts](#keyboard-shortcuts)
8. [Troubleshooting](#troubleshooting)

---

## 🚀 **Getting Started**

### **Your First AI Interaction**
```bash
# Start with a simple greeting
ai hello, I'm new to RinaWarp

# Ask for help with coding
ai how do I create a new React project?

# Get terminal assistance  
/explain the ls command
```

### **Understanding the Interface**

**Main Areas:**
- **Command Input**: Bottom text field for commands
- **Output Area**: Main terminal display
- **Sidebar**: Settings, AI provider info, help
- **Status Bar**: Connection status, current directory

---

## 🤖 **AI Commands Reference**

### **Basic AI Commands**

#### **`ai [your question]`**
Primary AI assistance command.

```bash
# Examples:
ai write a Python function to read JSON files
ai explain this error: ModuleNotFoundError
ai help me optimize this SQL query
ai what's the difference between REST and GraphQL?
```

#### **`ask [your question]`**  
Alternative to `ai` command (same functionality).

```bash
# Examples:
ask create a bash script to backup files  
ask debug this React component
ask how do I deploy to AWS?
```

#### **`/[your question]`**
Quick AI query (shorthand for `ai`).

```bash
# Examples:
/what is Docker?
/explain git rebase
/create a Python virtual environment
```

#### **`groq`**
Display Groq AI setup instructions.

```bash
groq
# Shows: API key setup, configuration help, troubleshooting
```

### **Advanced AI Usage**

#### **Multi-line Questions**
```bash
ai I have this error when running my Node.js app:
Error: Cannot find module 'express'
at Function.Module._resolveFilename
How do I fix this?
```

#### **Code Context Sharing**
```bash
ai here's my Python function:
def process_data(data):
    return data.upper()
    
How can I make this handle None values?
```

#### **Follow-up Questions**  
The AI remembers your conversation:
```bash
ai write a Python web scraper
# AI responds with scraper code
ai now add error handling to that code
# AI modifies the previous response
ai make it handle rate limiting too
# AI further enhances the code
```

---

## 💻 **Terminal Commands**

### **Built-in Commands**

#### **`help`**
Show built-in help and command list.

#### **`clear`**  
Clear the terminal output.

#### **`history`**
Show command history.

#### **`pwd`**
Show current directory.

#### **`ls`** / **`dir`**
List directory contents (platform-specific).

#### **`cd [directory]`**
Change directory.

### **System Commands**
All standard terminal commands work:
```bash
# File operations
cat file.txt
mkdir new-folder  
touch newfile.py
rm oldfile.txt

# Git commands
git status
git add .
git commit -m "Update"
git push

# Package managers
npm install
pip install requests
cargo build

# System info
ps aux
df -h
top
```

---

## 💡 **AI Best Practices**

### **How to Ask Better Questions**

#### **✅ Be Specific**
```bash
# Good:
ai write a Python function that reads a CSV file and returns a dictionary

# Less effective:
ai help with Python file handling
```

#### **✅ Include Context**  
```bash
# Good:
ai I'm building a React app and getting this error: [error details]
How do I fix it?

# Less effective:  
ai fix my React error
```

#### **✅ Specify Language/Framework**
```bash
# Good:
ai create a REST API endpoint in Node.js using Express

# Less effective:
ai create an API endpoint
```

### **Common Use Cases**

#### **🐛 Debugging**
```bash
ai I'm getting this Python error:
TypeError: 'str' object is not callable
Here's my code: [paste code]
What's wrong?
```

#### **📚 Learning**
```bash
ai explain what closures are in JavaScript with examples
ai what's the difference between let, const, and var?
ai how does async/await work in Python?
```

#### **⚡ Quick Code Generation**
```bash  
ai write a bash script to find all .txt files
ai create a CSS flexbox layout with centered content
ai generate a Python class for a user model
```

#### **🔧 Configuration Help**
```bash
ai how do I configure Docker for a Node.js app?
ai help me set up ESLint for a React project
ai create a .gitignore for a Python Django project
```

---

## 🎛️ **Advanced Features**

### **AI Model Selection**

**Available Models:**
- **llama-3.3-70b-versatile** (Default) - Best for complex coding questions
- **llama-3.1-8b-instant** - Fastest responses for simple questions  
- **deepseek-r1-distill-llama-70b** - Great for code analysis

**Change Model:**
Settings → AI Provider → Model

### **Conversation Memory**
The AI remembers your conversation within each session:
```bash
ai write a React component for a todo list
# AI creates component
ai add TypeScript types to that component  
# AI adds types to the previous component
ai now add unit tests
# AI creates tests for the typed component
```

### **Code Formatting**
AI automatically formats code with syntax highlighting:
- Python, JavaScript, TypeScript, Go, Rust
- HTML, CSS, JSON, YAML, XML
- Bash, SQL, Docker, etc.

---

## ⚙️ **Settings & Configuration**

### **AI Provider Settings**
**Location**: Settings → AI Provider

- **Provider**: Choose AI service (Groq recommended)
- **API Key**: Your Groq API key (`gsk_...`)
- **Model**: Select AI model for responses  
- **Temperature**: Control response creativity (0.1-1.0)

### **Appearance Settings**  
**Location**: Settings → Appearance

- **Theme**: Ocean (default), Dark, Light, Mermaid
- **Font Size**: Adjust terminal text size
- **Font Family**: Choose terminal font

### **Terminal Settings**
**Location**: Settings → Terminal

- **Shell**: Default system shell
- **Startup Directory**: Where terminal starts
- **History Size**: Number of commands to remember

---

## ⌨️ **Keyboard Shortcuts**

### **Global Shortcuts**
- **Ctrl/Cmd + ,** → Open Settings  
- **Ctrl/Cmd + K** → Focus command input
- **Ctrl/Cmd + L** → Clear terminal
- **Ctrl/Cmd + R** → Refresh terminal

### **Command Input**
- **↑/↓ arrows** → Browse command history
- **Tab** → Auto-complete commands
- **Ctrl/Cmd + A** → Select all text
- **Ctrl/Cmd + C** → Copy selected text
- **Ctrl/Cmd + V** → Paste text

### **Output Navigation**  
- **Ctrl/Cmd + Home** → Scroll to top
- **Ctrl/Cmd + End** → Scroll to bottom
- **Page Up/Down** → Scroll output
- **Ctrl/Cmd + F** → Search output

---

## 🔧 **Troubleshooting**

### **AI Issues**

#### **"AI is not configured"**
**Solution:**
1. Type `groq` for setup help
2. Settings → AI Provider → Enter API key
3. Restart RinaWarp Terminal

#### **"No response from AI"**
**Causes & Solutions:**
- **No API key**: Add your Groq key in settings
- **Invalid key**: Generate a new key at console.groq.com  
- **Network issues**: Check internet connection
- **Rate limits**: Wait 1 minute, try again

#### **Slow AI responses**
**Solutions:**
1. Switch to faster model (`llama-3.1-8b-instant`)
2. Check internet speed
3. Try shorter, more specific questions

### **App Issues**

#### **App won't start**
**Platform-specific solutions:**

**macOS:**
1. Right-click app → "Open" (bypass security)
2. System Preferences → Security → "Open Anyway"

**Windows:**
1. Run as Administrator
2. Check Windows Defender exclusions  
3. Temporarily disable antivirus

**Linux:**  
1. Verify file permissions: `chmod +x RinaWarp-Terminal.AppImage`
2. Install required dependencies: `sudo apt install libfuse2`

#### **Command not found errors**
**Solutions:**
1. Verify command exists on your system
2. Check PATH environment variable
3. Use full path to commands: `/usr/bin/python3`

#### **Permission denied errors**
**Solutions:**
1. Use `sudo` for system commands (Linux/macOS)
2. Run as Administrator (Windows)  
3. Check file/directory permissions

### **Performance Issues**

#### **High memory usage**
**Solutions:**
1. Clear terminal history: `history -c`
2. Restart RinaWarp Terminal
3. Close unused applications

#### **Slow terminal response**
**Solutions:**
1. Reduce output history in settings
2. Use less verbose commands
3. Check system resources with `top`/Task Manager

---

## 💬 **Getting Help**

### **Built-in Help**
```bash
help           # Show built-in commands
groq           # Groq setup assistance  
ai help me     # Ask AI for assistance
```

### **Support Channels**
- **📧 Email**: support@rinawarptech.com
- **💬 Discord**: [RinaWarp Community](https://discord.gg/rinawarp)  
- **📖 Documentation**: [rinawarptech.com/docs](https://rinawarptech.com/docs)
- **🐛 Bug Reports**: [GitHub Issues](https://github.com/rinawarp/issues)

### **Community Resources**
- **🎓 Tutorials**: Community-created guides
- **💡 Tips & Tricks**: Best practices sharing
- **🤝 User Forum**: Q&A with other users
- **📺 Video Guides**: Visual walkthroughs

---

## 🎉 **Pro Tips**

### **Maximize AI Effectiveness**
1. **Start broad, then narrow**: Ask general questions, then follow up with specifics
2. **Use examples**: Show AI what you're working with
3. **Ask for alternatives**: "Give me 3 different ways to do this"
4. **Request explanations**: "Explain how this code works"

### **Terminal Productivity**
1. **Use command history**: ↑ arrow to recall commands
2. **Leverage auto-complete**: Tab for command completion
3. **Chain commands**: Use `&&` and `||` for complex workflows
4. **Create aliases**: Set shortcuts for frequent commands

### **Best Workflows**
1. **Code → Test → Ask AI**: Write code, test it, ask AI for improvements
2. **Error → Copy → Ask AI**: Copy error messages for AI debugging
3. **Learn → Practice → Repeat**: Ask AI to explain, then practice the concept

---

**🚀 Happy coding with RinaWarp Terminal!**

*Last updated: January 2025*  
*Version: 3.0.0*
