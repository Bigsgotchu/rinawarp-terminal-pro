# RinaWarp Terminal - User Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [Installation](#installation)
3. [Basic Usage](#basic-usage)
4. [AI Features](#ai-features)
5. [Themes and Customization](#themes-and-customization)
6. [Voice Commands](#voice-commands)
7. [Keyboard Shortcuts](#keyboard-shortcuts)
8. [Settings](#settings)
9. [Troubleshooting](#troubleshooting)
10. [FAQs](#faqs)

---

## Getting Started

Welcome to RinaWarp Terminal! This advanced terminal emulator combines the power of traditional command-line interfaces with modern AI assistance and beautiful themes.

### System Requirements

- **macOS**: 10.14 or later
- **Windows**: Windows 10 or later (64-bit)
- **Linux**: Ubuntu 18.04+, Fedora 32+, or equivalent
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 200MB free space

---

## Installation

### macOS

1. Download `RinaWarp-Terminal-{version}.dmg` from [rinawarptech.com](https://rinawarptech.com)
2. Open the DMG file
3. Drag RinaWarp Terminal to your Applications folder
4. Right-click and select "Open" for first launch (bypasses Gatekeeper)

### Windows

1. Download `RinaWarp-Terminal-Setup-{version}.exe`
2. Run the installer
3. Follow the installation wizard
4. Launch from Start Menu or Desktop shortcut

### Linux

1. Download `RinaWarp-Terminal-{version}.AppImage`
2. Make it executable: `chmod +x RinaWarp-Terminal-*.AppImage`
3. Run: `./RinaWarp-Terminal-*.AppImage`

---

## Basic Usage

### Opening the Terminal

Launch RinaWarp Terminal from your applications. You'll see:
- **Terminal area**: Where you type commands
- **Tab bar**: Manage multiple terminal sessions
- **Status bar**: Shows current directory and session info

### Basic Commands

```bash
# Navigate directories
cd ~/Documents          # Change directory
ls -la                 # List files
pwd                    # Show current directory

# File operations
mkdir new-folder       # Create directory
touch file.txt        # Create file
rm file.txt          # Delete file

# Get help
man command          # Manual for command
command --help       # Command help
```

### Creating New Tabs

- **Keyboard**: `Cmd/Ctrl + T`
- **Mouse**: Click the `+` button in tab bar
- **Split pane**: `Cmd/Ctrl + D` (horizontal), `Cmd/Ctrl + Shift + D` (vertical)

---

## AI Features

### AI Command Assistance

Type `ai:` followed by your request:

```bash
ai: how do I find large files in my home directory
# AI will suggest: find ~ -type f -size +100M

ai: compress all images in current folder
# AI will provide the appropriate command
```

### Smart Command Completion

Start typing and press `Tab` for AI-powered suggestions:
```bash
git com[TAB]
# Shows: commit, checkout, clone, etc.
```

### Error Explanation

When a command fails, AI automatically explains:
```bash
$ rm protected-file
rm: protected-file: Permission denied
# AI: This error occurs because you don't have permission to delete this file. 
# Try: sudo rm protected-file (use with caution)
```

### Natural Language Commands

Enable in Settings → AI → Natural Language Mode:
```bash
> show me all PDF files modified this week
# Translates to: find . -name "*.pdf" -mtime -7
```

---

## Themes and Customization

### Changing Themes

1. **Quick Switch**: `Cmd/Ctrl + Shift + T`
2. **Theme Menu**: Settings → Appearance → Theme
3. **Command**: Type `theme` in terminal

### Available Themes

- 🌙 **Default Dark**: Classic dark with green accents
- 🌊 **Ocean Breeze**: Deep sea blues
- 🌅 **Sunset Glow**: Warm purple and orange
- 🌲 **Forest Dawn**: Fresh green tones
- 🦾 **Cyberpunk Neon**: Futuristic neon
- 🧜‍♀️ **Mermaid Depths**: Mystical underwater
- 📟 **Retro Terminal**: Classic green-on-black
- 🌸 **Pastel Dreams**: Soft pastel colors
- 🔲 **High Contrast**: Maximum readability

### Custom Themes

Create your own theme:
1. Settings → Appearance → Custom Theme
2. Adjust colors using the color picker
3. Save with a custom name

### Font Settings

- **Font Family**: Choose from system fonts
- **Font Size**: 10-24pt
- **Line Height**: 1.0-2.0
- **Letter Spacing**: -1 to 3

---

## Voice Commands

### Setup

1. Enable in Settings → Voice → Enable Voice Commands
2. Grant microphone permission when prompted
3. Choose activation method:
   - **Push-to-talk**: Hold `Space` while speaking
   - **Wake word**: Say "Hey Rina"
   - **Always listening**: Continuous recognition

### Basic Voice Commands

- "Open new tab"
- "Switch to tab 2"
- "Close current tab"
- "Clear terminal"
- "Run last command"
- "Show me files here"

### AI Voice Queries

- "How do I [task]"
- "What's the command for [action]"
- "Explain this error"
- "Help me debug this"

### Voice Settings

- **Voice Model**: Choose AI voice
- **Speech Speed**: 0.5x - 2.0x
- **Voice Feedback**: Audio confirmations
- **Transcription Display**: Show what was heard

---

## Keyboard Shortcuts

### Essential Shortcuts

| Action | macOS | Windows/Linux |
|--------|-------|---------------|
| New Tab | `Cmd + T` | `Ctrl + T` |
| Close Tab | `Cmd + W` | `Ctrl + W` |
| Next Tab | `Cmd + →` | `Ctrl + Tab` |
| Previous Tab | `Cmd + ←` | `Ctrl + Shift + Tab` |
| Copy | `Cmd + C` | `Ctrl + Shift + C` |
| Paste | `Cmd + V` | `Ctrl + Shift + V` |
| Clear | `Cmd + K` | `Ctrl + L` |
| Find | `Cmd + F` | `Ctrl + F` |
| Zoom In | `Cmd + +` | `Ctrl + +` |
| Zoom Out | `Cmd + -` | `Ctrl + -` |

### Advanced Shortcuts

| Action | Shortcut |
|--------|----------|
| Split Horizontal | `Cmd/Ctrl + D` |
| Split Vertical | `Cmd/Ctrl + Shift + D` |
| Focus Next Pane | `Cmd/Ctrl + ]` |
| AI Assistant | `Cmd/Ctrl + I` |
| Command Palette | `Cmd/Ctrl + Shift + P` |
| Settings | `Cmd/Ctrl + ,` |
| Toggle Theme | `Cmd/Ctrl + Shift + T` |

---

## Settings

### General

- **Shell**: Choose default shell (bash, zsh, fish, pwsh)
- **Working Directory**: Default starting directory
- **Restore Tabs**: Reopen tabs from last session

### Appearance

- **Theme**: Choose from 20+ themes
- **Font**: Family, size, weight
- **Cursor**: Style (block, line, underline), blinking
- **Window**: Transparency, blur effect

### AI Settings

- **Provider**: Anthropic Claude (default), OpenAI
- **Model**: Claude 3, GPT-4, etc.
- **Context Length**: How much history AI sees
- **Auto-suggestions**: Enable/disable
- **Natural Language**: Parse natural language as commands

### Privacy & Security

- **Telemetry**: Opt-in analytics
- **Command History**: Local storage only
- **AI Data**: Never sent without permission
- **Encryption**: Secure credential storage

### Advanced

- **Performance**: GPU acceleration, render throttling
- **Shell Integration**: Custom prompts, integrations
- **Developer Mode**: Extra debugging features

---

## Troubleshooting

### Common Issues

#### Terminal won't start
1. Check system requirements
2. Reinstall with latest version
3. Reset settings: Delete `~/.rinawarp-terminal/config.json`

#### Commands not working
1. Verify shell is properly configured
2. Check PATH environment variable
3. Try with a different shell

#### AI features unavailable
1. Check internet connection
2. Verify API key in Settings → AI
3. Check firewall settings

#### Performance issues
1. Disable GPU acceleration in Settings
2. Reduce terminal scrollback buffer
3. Close unused tabs

### Reset to Defaults

Hold `Shift` while launching to start in safe mode with default settings.

### Debug Mode

Launch with debug flag:
```bash
# macOS/Linux
/Applications/RinaWarp\ Terminal.app/Contents/MacOS/RinaWarp\ Terminal --debug

# Windows
"C:\Program Files\RinaWarp Terminal\RinaWarp Terminal.exe" --debug
```

### Log Files

Find logs at:
- **macOS**: `~/Library/Logs/RinaWarp Terminal/`
- **Windows**: `%APPDATA%\RinaWarp Terminal\logs\`
- **Linux**: `~/.config/RinaWarp Terminal/logs/`

---

## FAQs

### Q: How do I add my own AI API key?

A: Go to Settings → AI → API Configuration and enter your key. We support:
- Anthropic Claude
- OpenAI GPT
- Local models via Ollama

### Q: Can I use my existing terminal configuration?

A: Yes! RinaWarp Terminal respects:
- `.bashrc` / `.zshrc` configurations
- Custom aliases and functions
- Environment variables
- SSH configs

### Q: Is my data private?

A: Absolutely. We:
- Never store commands in the cloud
- Process AI requests directly with providers
- Encrypt all stored credentials
- Allow complete offline usage (without AI)

### Q: How do I migrate from another terminal?

A: Import settings via:
1. Settings → Import/Export
2. Select your previous terminal type
3. Follow the migration wizard

### Q: Can I sync settings across devices?

A: Cloud sync is coming soon! Currently, you can:
1. Export settings to file
2. Import on another device
3. Use version control for dotfiles

### Q: How do updates work?

A: RinaWarp Terminal can:
- Auto-check for updates (optional)
- Download in background
- Install on next restart
- Manual check: Help → Check for Updates

---

## Support

- **Documentation**: [docs.rinawarptech.com](https://docs.rinawarptech.com)
- **Community**: [discord.gg/rinawarp](https://discord.gg/rinawarp)
- **Issues**: [github.com/RinaWarp-Terminal/issues](https://github.com/RinaWarp-Terminal/issues)
- **Email**: support@rinawarptech.com

---

## Pro Tips

1. **Quick directory jump**: Type `z partial-name` to jump to recent directories
2. **Command history search**: `Ctrl + R` then start typing
3. **Multi-select files**: Hold `Cmd/Ctrl` while clicking in file listings
4. **Pipe to AI**: `command | ai: explain this output`
5. **Save command snippets**: Right-click any command → Save as Snippet

---

*Thank you for choosing RinaWarp Terminal! We're constantly improving based on your feedback.*
