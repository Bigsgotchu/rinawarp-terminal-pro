# RinaWarp Terminal - Quick Start Guide

🚀 **Ready to use in 2 minutes!**

## Instant Usage (Current Build)

If you've just built RinaWarp Terminal, you can start using it immediately:

### Windows
```powershell
# Navigate to the built executable
cd "C:\Users\gille\rinawarp-terminal\dist\win-unpacked"

# Launch RinaWarp Terminal
.\"RinaWarp Terminal.exe"
```

### Or double-click:
📁 Go to: `C:\Users\gille\rinawarp-terminal\dist\win-unpacked\`
🖱️ Double-click: `RinaWarp Terminal.exe`

## First Time Setup (30 seconds)

### 1. Choose Your Theme
- Click ⚙️ **Settings** in the title bar
- Select your preferred theme:
  - **Dark** (default) - Easy on the eyes
  - **Light** - Clean and bright
  - **Solarized** - Popular developer theme
  - **Monokai** - Vibrant colors

### 2. Adjust Font Size
- In Settings, use the **Font Size** slider (10-24px)
- Or use keyboard shortcuts:
  - `Ctrl++` - Increase font
  - `Ctrl+-` - Decrease font
  - `Ctrl+0` - Reset to default

### 3. Enable Features (Optional)
✅ **Command Suggestions** - Already enabled  
✅ **AI Assistance** - Mock suggestions enabled  
⚙️ **Real AI** - Add your API key for real AI (optional)

## Essential Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+T` | New tab |
| `Ctrl+Shift+W` | Close tab |
| `Ctrl+Tab` | Next tab |
| `Ctrl+Shift+Tab` | Previous tab |
| `Ctrl+,` | Settings |
| `Ctrl+F` | Find in terminal |
| `Ctrl+C` | Copy (when text selected) |
| `Ctrl+V` | Paste |
| `Escape` | Close dialogs/suggestions |

## Quick Features Tour

### 🔄 Multiple Tabs
- Click **+** button for new tab
- Close tabs with **×** or `Ctrl+Shift+W`
- Switch tabs by clicking or `Ctrl+Tab`

### 📊 Split Terminals
- Click **⬌** for horizontal split
- Click **⬍** for vertical split
- Each split can run different commands

### 💡 Smart Suggestions
- Start typing a command
- See suggestions appear automatically
- Use `↑/↓` arrows to navigate
- Press `Tab` or `Enter` to accept

### 🌿 Git Integration
- Navigate to any Git repository
- See branch name in status bar
- Color coding:
  - 🟢 Green: Clean repository
  - 🟡 Yellow: Uncommitted changes
  - 🟠 Orange: Unpushed commits

### 🖱️ Right-Click Menu
- Right-click anywhere in terminal
- Quick access to:
  - Copy/Paste
  - New/Close tabs
  - Split terminals
  - Settings

### 📂 Session Management
- Click **💾 Sessions** in status bar
- Save your current terminal setup
- Restore sessions later
- Export/import between computers

### ☁️ Cloud Sync (Advanced)
- Click **☁️ Sync** in status bar
- Connect to GitHub, Dropbox, or custom endpoint
- Sync settings and history across devices

## Test Drive Commands

Try these commands to test features:

```bash
# Test Git integration
cd path/to/your/git/repo
git status

# Test command suggestions
git   # (type 'git ' and see suggestions)
npm   # (type 'npm ' and see suggestions)

# Test themes
# Use Ctrl+Shift+1-4 to quick-switch themes

# Test splits
# Use terminal header buttons to split
```

## Troubleshooting

**Terminal not opening?**
- Make sure you're running the exe from `dist/win-unpacked/`
- Try running as administrator
- Check Windows Defender isn't blocking it

**Suggestions not working?**
- Check Settings → Enable Command Suggestions is checked
- Try typing common commands like `git`, `npm`, `ls`

**Can't see Git info?**
- Navigate to a Git repository folder
- Make sure Git is installed and in PATH
- Try running `git status` manually

**Want to reset everything?**
- Close RinaWarp Terminal
- Delete settings: `%APPDATA%\RinaWarp\` (Windows)
- Restart the application

## Next Steps

### For Daily Use
1. **Pin to taskbar** for quick access
2. **Set as default terminal** in Windows Terminal settings
3. **Create desktop shortcut** for convenience

### For Power Users
1. **Set up AI integration** with OpenAI/Anthropic API
2. **Configure cloud sync** for multi-device workflows
3. **Create custom themes** for personalization
4. **Write plugins** using the Plugin Development API

### For Developers
1. **Read [INSTALL.md](INSTALL.md)** for complete setup options
2. **Check [README.md](README.md)** for full feature documentation
3. **Explore plugin development** for custom functionality

## 🎉 You're Ready!

RinaWarp Terminal is now ready for daily use. It's a complete, enterprise-grade terminal with all the modern features you need.

**Enjoy the most advanced open-source terminal experience!** 🚀

---

💡 **Tip**: Press `Ctrl+,` anytime to access settings and explore more features!

📚 **Need more help?** Check the [complete installation guide](INSTALL.md) or [full documentation](README.md).

