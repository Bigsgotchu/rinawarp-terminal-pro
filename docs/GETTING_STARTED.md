# 🚀 Getting Started with RinaWarp Terminal

Welcome to RinaWarp Terminal! This guide will get you up and running in just a few minutes. 

![RinaWarp Welcome](../assets/marketing/welcome-banner.png)

## ⚡ Quick Start (2 minutes)

### Step 1: Installation
Choose your platform and download:

#### 🍎 macOS
```bash
# Download and install
curl -L https://rinawarptech.com/releases/RinaWarp-Terminal-macOS.zip -o RinaWarp.zip
unzip RinaWarp.zip
mv "RinaWarp Terminal.app" /Applications/
```

#### 🪟 Windows
```powershell
# Download installer
Invoke-WebRequest -Uri "https://rinawarptech.com/releases/RinaWarp-Terminal-Setup-Windows.exe" -OutFile "RinaWarp-Setup.exe"
# Run installer
.\RinaWarp-Setup.exe
```

#### 🐧 Linux
```bash
# Ubuntu/Debian
wget https://rinawarptech.com/releases/RinaWarp-Terminal-Linux.deb
sudo dpkg -i RinaWarp-Terminal-Linux.deb

# Or AppImage (universal)
wget https://rinawarptech.com/releases/RinaWarp-Terminal-Linux.AppImage
chmod +x RinaWarp-Terminal-Linux.AppImage
./RinaWarp-Terminal-Linux.AppImage
```

### Step 2: First Launch
1. Open RinaWarp Terminal from your applications
2. Complete the 30-second welcome setup
3. Choose your preferred theme (we recommend starting with "Mermaid Magic" 🧜‍♀️)

### Step 3: Try Your First AI Command
Type this command to see Rina in action:
```bash
rina "show me system information"
```

🎉 **Congratulations!** You're now ready to explore the full power of RinaWarp Terminal.

---

## 🧜‍♀️ Meet Rina - Your AI Assistant

Rina is your intelligent terminal companion who can:

### 🤖 Understand Natural Language
Instead of remembering complex commands, just talk to Rina:

```bash
# Traditional way
find . -name "*.js" -type f -exec grep -l "function" {} \;

# The RinaWarp way
rina "find all JavaScript files that contain functions"
```

### 🎤 Respond to Voice Commands
Enable voice control in Settings and try:
- **"Hey Rina, what's my disk usage?"**
- **"Hey Rina, show me my Git status"**
- **"Hey Rina, create a new directory called projects"**

### 💡 Provide Intelligent Suggestions
Rina learns from your workflow and suggests:
- **Command completions** as you type
- **Error solutions** when commands fail
- **Workflow optimizations** based on your patterns

---

## 🎨 Customization & Themes

### Choose Your Perfect Theme
Access themes via Settings (⚙️) → Themes:

1. **🧜‍♀️ Mermaid Magic** - Our signature underwater theme
2. **🌙 Ocean Deep** - Dark theme with deep blue gradients  
3. **☀️ Coral Reef** - Light theme with warm coral colors
4. **❄️ Arctic Ice** - Cool blue theme for focus
5. **🌸 Sunset Beach** - Warm pink and orange gradients
6. **⚡ Electric Current** - High-contrast neon theme

### Keyboard Shortcuts
Master these shortcuts to boost productivity:

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+T` | New tab |
| `Ctrl+Shift+W` | Close current tab |
| `Ctrl+,` | Open settings |
| `Ctrl+Shift+P` | Split pane horizontally |
| `Ctrl+Shift+|` | Split pane vertically |
| `Tab` | Accept AI suggestion |
| `Esc` | Close suggestions |

---

## 📋 Essential Features Tour

### 1. Multi-Tab Workflow
- **Create tabs** for different projects
- **Split panes** to monitor multiple processes
- **Session management** saves your workspace

### 2. Smart Command History
- **Searchable history** with `Ctrl+R`
- **Contextual suggestions** based on current directory
- **Shared history** across tabs

### 3. Git Integration
- **Live branch status** in the status bar
- **Change indicators** for modified files
- **Smart Git suggestions** from Rina

### 4. Performance Monitoring
- **Real-time memory usage** tracking
- **Command performance** analytics
- **System resource monitoring**

---

## 💰 Upgrading Your Plan

You're currently on the **Free Starter** plan. Here's what you get with upgrades:

### 🌟 Personal Plan ($15/month)
- **Advanced AI Features**: More intelligent responses
- **Voice Commands**: Full speech recognition and TTS
- **Cloud Sync**: Access your settings anywhere
- **3 Device Licenses**: Use on multiple computers
- **Email Support**: Direct help when needed

### 🚀 Professional Plan ($29/month)
- **Everything in Personal**
- **ElevenLabs Voice AI**: Professional voice synthesis
- **Team Collaboration**: Share sessions with teammates
- **5 Device Licenses**: Perfect for teams
- **Priority Support**: Fastest response times
- **Beta Access**: Try new features first

**Upgrade anytime** via Settings → Account → Upgrade Plan

---

## 🎯 Common Use Cases

### For Developers
```bash
# Code review workflow
rina "show me files changed in the last commit"
rina "find all TODO comments in this project"
rina "run tests and show me any failures"

# Project setup
rina "create a new React project called my-app"
rina "set up Git with initial commit"
```

### For DevOps Engineers
```bash
# System monitoring
rina "show me system health dashboard"
rina "check Docker container status" 
rina "monitor disk space usage"

# Deployment tasks
rina "deploy to staging environment"
rina "check application logs for errors"
```

### For Data Scientists
```bash
# Environment management
rina "activate my data science environment"
rina "show me Python package versions"
rina "run Jupyter notebook server"

# Data analysis
rina "show me CSV file structure"
rina "generate data summary statistics"
```

---

## 🔧 Troubleshooting

### Common Issues & Solutions

#### ❓ "Rina isn't responding to voice commands"
**Solution:**
1. Check microphone permissions in your system settings
2. Ensure the 🎤 Voice Control button is enabled
3. Try the keyboard shortcut `Ctrl+Shift+V` to activate voice mode
4. Check Settings → Voice Features → Test Microphone

#### ❓ "Commands are running slowly"
**Solution:**
1. Check Settings → Performance → Clear Cache
2. Restart RinaWarp Terminal
3. Update to the latest version via Help → Check for Updates

#### ❓ "AI suggestions aren't accurate"
**Solution:**
1. Give Rina more context: `rina "in this Node.js project, show me package dependencies"`
2. Check your plan - Advanced AI requires Personal or Professional plans
3. Try rephrasing your request with more specific terms

#### ❓ "Themes not applying correctly"
**Solution:**
1. Close and reopen terminals after theme changes
2. Check Settings → Appearance → Reset to Default
3. Clear browser cache if using web version

### Getting Help
- **📖 Documentation**: [docs.rinawarptech.com](https://docs.rinawarptech.com)
- **💬 Community**: [discord.gg/rinawarp](https://discord.gg/rinawarp)
- **📧 Support**: [support@rinawarptech.com](mailto:support@rinawarptech.com)
- **🐛 Bug Reports**: [GitHub Issues](https://github.com/rinawarp/terminal/issues)

---

## 🎓 Pro Tips

### ⚡ Productivity Boosters
1. **Use tab completion**: Type `rina "` and press Tab to see suggestions
2. **Create aliases**: Settings → Commands → Custom Aliases
3. **Save sessions**: Settings → Sessions → Auto-save enabled
4. **Use split panes**: Perfect for monitoring logs while developing

### 🧠 AI Best Practices  
1. **Be specific**: "show me JavaScript files modified today" vs "show me files"
2. **Add context**: "in this React project" helps Rina understand your environment
3. **Chain commands**: "run tests, then if they pass, commit changes"

### 🎤 Voice Command Tips
1. **Speak clearly**: Pause slightly between words
2. **Use "Hey Rina"** to activate voice mode
3. **Try natural language**: "What's taking up disk space?" works better than technical commands

---

## 📈 Next Steps

### Week 1: Master the Basics
- [ ] Try 5 different AI commands
- [ ] Customize your theme
- [ ] Enable voice commands
- [ ] Create your first split pane

### Week 2: Advanced Features  
- [ ] Set up cloud sync (Personal+ plan)
- [ ] Try team collaboration (Professional plan)
- [ ] Configure custom aliases
- [ ] Explore session management

### Month 1: Power User
- [ ] Create custom workflows
- [ ] Join the community Discord
- [ ] Share feedback and feature requests
- [ ] Refer friends (earn credits!)

---

## 🌟 Welcome to the RinaWarp Family!

You've joined **10,000+ developers** who are saving **2.5+ hours daily** with RinaWarp Terminal. 

**What makes our community special:**
- 🤝 **Supportive**: Helpful developers from around the world
- 🚀 **Innovative**: Early access to cutting-edge terminal features  
- 🧜‍♀️ **Fun**: Who says terminals can't be delightful?

### Stay Connected
- 🐦 **Twitter**: [@rinawarp](https://twitter.com/rinawarp)
- 💼 **LinkedIn**: [RinaWarp Technologies](https://linkedin.com/company/rinawarp)
- 📺 **YouTube**: [RinaWarp Channel](https://youtube.com/@rinawarp)

---

**Ready to dive deeper?** 🌊

- 📖 **[Advanced Features Guide](ADVANCED_FEATURES.md)**
- 🔌 **[Plugin Development](PLUGIN_DEVELOPMENT.md)** 
- 🎯 **[Workflow Optimization](WORKFLOW_OPTIMIZATION.md)**
- 🔒 **[Security Best Practices](SECURITY_GUIDE.md)**

---

<div align="center">

**Happy coding with RinaWarp Terminal!** 🧜‍♀️✨

*Built with 💙 by the RinaWarp Team*

</div>
