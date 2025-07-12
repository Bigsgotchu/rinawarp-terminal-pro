# Installation Guide

## Complete Installation Instructions

This guide provides detailed installation instructions for all platforms, including troubleshooting and advanced setup options.

## System Requirements

### Minimum Requirements
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 500MB free space
- **OS**: Windows 10+, macOS 10.14+, or Linux (Ubuntu 18.04+)

### Recommended Requirements
- **RAM**: 8GB or more
- **Storage**: 1GB free space
- **CPU**: Multi-core processor
- **Network**: Internet connection for updates and AI features

## Installation Methods

### Windows

#### Method 1: Installer (Recommended)
1. Download the latest `.exe` installer from [GitHub Releases](https://github.com/Bigsgotchu/rinawarp-terminal/releases)
2. Run the installer as Administrator
3. Follow the setup wizard
4. Launch from Start Menu or Desktop shortcut

#### Method 2: Portable Version
1. Download the portable `.zip` file
2. Extract to your preferred location
3. Run `RinaWarp Terminal.exe`

#### Method 3: Package Managers
```powershell
# Chocolatey
choco install rinawarp-terminal

# Winget
winget install RinaWarp.Terminal

# Scoop
scoop install rinawarp-terminal
```

### macOS

#### Method 1: DMG Package (Recommended)
1. Download the `.dmg` file from releases
2. Open the DMG file
3. Drag RinaWarp Terminal to Applications folder
4. Launch from Applications or Launchpad

#### Method 2: Homebrew
```bash
# Add tap (if not already added)
brew tap rinawarp/terminal

# Install
brew install --cask rinawarp-terminal
```

### Linux

#### Ubuntu/Debian
```bash
# Download DEB package
wget https://github.com/Bigsgotchu/rinawarp-terminal/releases/latest/download/rinawarp-terminal.deb

# Install
sudo dpkg -i rinawarp-terminal.deb

# Fix dependencies if needed
sudo apt-get install -f
```

#### AppImage (Universal)
```bash
# Download AppImage
wget https://github.com/Bigsgotchu/rinawarp-terminal/releases/latest/download/RinaWarp-Terminal.AppImage

# Make executable
chmod +x RinaWarp-Terminal.AppImage

# Run
./RinaWarp-Terminal.AppImage
```

#### Snap Package
```bash
sudo snap install rinawarp-terminal
```

#### Flatpak
```bash
flatpak install flathub com.rinawarp.Terminal
```

## Post-Installation Setup

### First Launch
1. Start RinaWarp Terminal
2. Choose your preferred theme (Dark/Light/Solarized/Monokai)
3. Configure shell integration if prompted
4. Test basic functionality

### Shell Integration
The terminal automatically detects and integrates with:
- **Windows**: PowerShell, Command Prompt, WSL
- **macOS**: bash, zsh, fish
- **Linux**: bash, zsh, fish, dash

### AI Features Setup
1. Internet connection required for AI suggestions
2. No additional configuration needed
3. Features activate automatically on first use

## Troubleshooting

### Windows Issues

#### "Windows protected your PC" Warning
1. Click "More info"
2. Click "Run anyway"
3. Or: Download from Microsoft Store (coming soon)

#### Installation Fails
```powershell
# Run as Administrator
Right-click installer → "Run as administrator"

# Check Windows version
winver

# Ensure .NET Framework is installed
# Download from Microsoft if needed
```

#### PowerShell Execution Policy
```powershell
# Check current policy
Get-ExecutionPolicy

# Set policy (if needed)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### macOS Issues

#### "App can't be opened" Error
```bash
# Remove quarantine attribute
sudo xattr -r -d com.apple.quarantine "/Applications/RinaWarp Terminal.app"

# Or: System Preferences → Security & Privacy → Allow
```

#### Missing Dependencies
```bash
# Install Xcode Command Line Tools
xcode-select --install

# Install Homebrew (if using Homebrew method)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### Linux Issues

#### Missing Dependencies
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install libgtk-3-0 libxss1 libatspi2.0-0 libdrm2 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libxkbcommon0 libasound2

# CentOS/RHEL/Fedora
sudo yum install gtk3 libXScrnSaver at-spi2-atk libdrm libxcomposite libXdamage libXrandr mesa-libgbm libxkbcommon alsa-lib
```

#### Permission Issues
```bash
# Make AppImage executable
chmod +x RinaWarp-Terminal.AppImage

# Fix desktop integration
sudo apt-get install desktop-file-utils
```

## Advanced Configuration

### Custom Installation Location
- **Windows**: Use `/D=C:\Custom\Path` with installer
- **macOS**: Drag to any folder, not just Applications
- **Linux**: Extract AppImage anywhere

### Enterprise Deployment
- Silent installation options available
- Group Policy templates (Windows)
- MDM deployment profiles (macOS)
- Configuration management support (Linux)

### Network Configuration
- Proxy support: Configure in settings
- Firewall: Allow outbound HTTPS (port 443)
- Corporate networks: Contact IT for whitelist

## Uninstallation

### Windows
1. Settings → Apps → RinaWarp Terminal → Uninstall
2. Or: Control Panel → Programs → Uninstall

### macOS
1. Drag from Applications to Trash
2. Empty Trash

### Linux
```bash
# DEB package
sudo apt-get remove rinawarp-terminal

# Snap
sudo snap remove rinawarp-terminal

# Flatpak
flatpak uninstall com.rinawarp.Terminal

# AppImage
rm RinaWarp-Terminal.AppImage
```

## Support

### Getting Help
- [GitHub Issues](https://github.com/Bigsgotchu/rinawarp-terminal/issues)
- [Documentation](https://github.com/Bigsgotchu/rinawarp-terminal/docs)
- Email: rinawarptechnologies25@gmail.com

### Reporting Issues
Include:
- Operating system and version
- Installation method used
- Error messages (if any)
- Steps to reproduce

### Community
- [Discussions](https://github.com/Bigsgotchu/rinawarp-terminal/discussions)
- [Discord](https://discord.gg/rinawarp) (coming soon)
- [Reddit](https://reddit.com/r/RinaWarp) (coming soon)

## Next Steps

After successful installation:
1. Read the [Quick Start Guide](QUICKSTART.md)
2. Explore the [Setup Guide](SETUP.md) for advanced features
3. Check out the main [README](../../README.md) for full feature list
