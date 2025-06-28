# RinaWarp Terminal - Installation Guide

Welcome to RinaWarp Terminal! This guide will help you install and set up the most advanced open-source terminal emulator.

## 🚀 Quick Install (Recommended)

### Windows

1. **Download the Latest Release**
   - Go to the [Releases page](https://github.com/your-username/rinawarp-terminal/releases)
   - Download `RinaWarp-Terminal-Setup.exe` for the installer
   - Or download `RinaWarp-Terminal-Portable.zip` for portable version

2. **Run the Installer**
   ```
   Double-click RinaWarp-Terminal-Setup.exe
   Follow the installation wizard
   ```

3. **Launch RinaWarp Terminal**
   - From Start Menu: Search "RinaWarp Terminal"
   - From Desktop: Double-click the RinaWarp Terminal icon
   - From Command Line: `rinawarp` (if added to PATH)

### macOS

1. **Download the Latest Release**
   - Download `RinaWarp-Terminal.dmg` from releases

2. **Install**
   ```bash
   # Mount the DMG
   open RinaWarp-Terminal.dmg
   
   # Drag RinaWarp Terminal to Applications folder
   # Launch from Applications or Spotlight
   ```

### Linux

1. **Ubuntu/Debian (.deb)**
   ```bash
   # Download the .deb package
   wget https://github.com/your-username/rinawarp-terminal/releases/latest/download/rinawarp-terminal.deb
   
   # Install
   sudo dpkg -i rinawarp-terminal.deb
   sudo apt-get install -f  # Fix any dependency issues
   
   # Launch
   rinawarp-terminal
   ```

2. **Red Hat/CentOS/Fedora (.rpm)**
   ```bash
   # Download the .rpm package
   wget https://github.com/your-username/rinawarp-terminal/releases/latest/download/rinawarp-terminal.rpm
   
   # Install
   sudo rpm -i rinawarp-terminal.rpm
   
   # Launch
   rinawarp-terminal
   ```

3. **AppImage (Universal Linux)**
   ```bash
   # Download AppImage
   wget https://github.com/your-username/rinawarp-terminal/releases/latest/download/RinaWarp-Terminal.AppImage
   
   # Make executable
   chmod +x RinaWarp-Terminal.AppImage
   
   # Run
   ./RinaWarp-Terminal.AppImage
   ```

## 📦 Package Managers

### Windows Package Managers

**Chocolatey:**
```powershell
choco install rinawarp-terminal
```

**Winget:**
```powershell
winget install RinaWarp.Terminal
```

**Scoop:**
```powershell
scoop bucket add extras
scoop install rinawarp-terminal
```

### macOS Package Managers

**Homebrew:**
```bash
brew install --cask rinawarp-terminal
```

### Linux Package Managers

**Snap:**
```bash
sudo snap install rinawarp-terminal
```

**Flatpak:**
```bash
flatpak install flathub com.rinawarp.Terminal
```

## 🛠️ Build from Source

### Prerequisites

- **Node.js** 16.0 or higher
- **npm** 7.0 or higher
- **Git**
- **Build tools:**
  - Windows: Visual Studio Build Tools 2019+
  - macOS: Xcode Command Line Tools
  - Linux: build-essential, libnss3-dev, libxss1

### Installation Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-username/rinawarp-terminal.git
   cd rinawarp-terminal
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Development Mode (Optional)**
   ```bash
   npm run dev
   ```

4. **Build for Production**
   ```bash
   # Build for current platform
   npm run build
   
   # Build for specific platforms
   npm run build:win     # Windows
   npm run build:mac     # macOS
   npm run build:linux   # Linux
   ```

5. **Find Your Executable**
   - Windows: `dist/win-unpacked/RinaWarp Terminal.exe`
   - macOS: `dist/mac/RinaWarp Terminal.app`
   - Linux: `dist/linux-unpacked/rinawarp-terminal`

## ⚙️ Post-Installation Setup

### 1. First Launch Configuration

When you first launch RinaWarp Terminal:

1. **Choose Your Theme**
   - Click the ⚙️ Settings button
   - Select from: Dark, Light, Solarized, Monokai
   - Adjust font size (10-24px)

2. **Configure Shell**
   - Windows: PowerShell (default) or Command Prompt
   - macOS/Linux: Bash, Zsh, or your preferred shell

### 2. Enable AI Features (Optional)

1. **Get an API Key**
   - OpenAI: https://platform.openai.com/api-keys
   - Anthropic: https://console.anthropic.com/
   - Local AI: Install Ollama locally

2. **Configure in Settings**
   ```
   Settings → AI Assistance → Enable Real AI
   Enter your API key
   Choose provider (OpenAI/Anthropic/Local)
   ```

### 3. Set Up Cloud Sync (Optional)

**GitHub Sync:**
1. Create a GitHub personal access token
2. Create a private repository for sync data
3. Settings → Cloud Sync → GitHub → Configure

**Dropbox Sync:**
1. Create a Dropbox app and get access token
2. Settings → Cloud Sync → Dropbox → Configure

### 4. Session Management

- **Save Current Session**: Status Bar → 💾 Sessions → Save Current
- **Auto-save**: Enabled by default in Settings
- **Export/Import**: Share sessions between computers

## 🔧 Advanced Configuration

### Custom Themes

Create custom themes by modifying `~/.rinawarp/themes/custom.yaml`:

```yaml
name: My Custom Theme
background: "#1e1e1e"
foreground: "#ffffff"
accent: "#007acc"
terminal_colors:
  normal:
    black: "#000000"
    red: "#ff0000"
    # ... more colors
```

### Plugin Development

Create custom plugins:

```javascript
// ~/.rinawarp/plugins/my-plugin.js
class MyPlugin {
    constructor() {
        this.hooks = {
            'terminal-created': this.onTerminalCreated.bind(this)
        };
    }
    
    async onTerminalCreated(terminalData) {
        console.log('New terminal created!');
    }
}

window.WarpPluginAPI.registerPlugin('my-plugin', new MyPlugin());
```

### Keyboard Shortcuts Customization

Edit `~/.rinawarp/keybindings.json`:

```json
{
    "new_tab": "Ctrl+Shift+T",
    "close_tab": "Ctrl+Shift+W",
    "settings": "Ctrl+,",
    "find": "Ctrl+F",
    "increase_font": "Ctrl+Plus",
    "decrease_font": "Ctrl+Minus"
}
```

## 🐛 Troubleshooting

### Common Issues

**Windows: "App can't run on this PC"**
```
Solution: Download the correct architecture (x64/x86)
Or run: winget install Microsoft.VCRedist.2015+.x64
```

**macOS: "App is damaged and can't be opened"**
```bash
# Remove quarantine attribute
sudo xattr -rd com.apple.quarantine "/Applications/RinaWarp Terminal.app"
```

**Linux: Missing dependencies**
```bash
# Ubuntu/Debian
sudo apt install libnss3 libxss1 libgconf-2-4 libxrandr2 libasound2 libpangocairo-1.0-0 libatk1.0-0 libgtk-3-0 libgdk-pixbuf2.0-0

# CentOS/RHEL/Fedora
sudo yum install nss libXScrnSaver GConf2 libXrandr alsa-lib
```

**Terminal not responding**
```
1. Check if shell is properly configured
2. Try different shell in Settings
3. Reset settings: Delete ~/.rinawarp/settings.json
4. Restart application
```

**AI features not working**
```
1. Verify API key is correct
2. Check internet connection
3. Verify API provider is selected correctly
4. Check API quota/billing status
```

### Performance Issues

**Slow startup:**
- Disable unnecessary plugins
- Reduce command history size
- Check antivirus exclusions

**High memory usage:**
- Limit number of open tabs
- Clear command history periodically
- Disable AI assistance if not needed

### Log Files

**Windows:** `%APPDATA%\RinaWarp\logs\`
**macOS:** `~/Library/Logs/RinaWarp/`
**Linux:** `~/.config/RinaWarp/logs/`

## 🔄 Updates

### Automatic Updates

RinaWarp Terminal checks for updates automatically:
- Notifications appear when updates are available
- Updates can be installed from Settings → About → Check for Updates

### Manual Updates

1. **Download latest release** from GitHub
2. **Install over existing** installation (settings preserved)
3. **Or build from source** with latest code

## 🆘 Support

### Getting Help

- **Documentation**: https://github.com/your-username/rinawarp-terminal/wiki
- **Issues**: https://github.com/your-username/rinawarp-terminal/issues
- **Discussions**: https://github.com/your-username/rinawarp-terminal/discussions
- **Discord**: [Community Server](discord-link)

### Reporting Bugs

When reporting issues, include:
- Operating system and version
- RinaWarp Terminal version
- Steps to reproduce
- Log files (if applicable)
- Screenshots/videos (if UI related)

## 🎉 Welcome to RinaWarp Terminal!

You're now ready to experience the most advanced open-source terminal emulator. Enjoy the powerful features, AI assistance, and complete customization!

**Quick Start Tips:**
- Press `Ctrl+,` to open settings
- Right-click in terminal for context menu
- Use `Ctrl+Shift+T` for new tabs
- Try natural language commands (with AI enabled)
- Explore the session manager for workflow organization

Happy terminal computing! 🚀

