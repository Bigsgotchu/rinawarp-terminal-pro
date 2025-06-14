# Building RinaWarp Terminal Installer

This guide explains how to create executable installers for RinaWarp Terminal.

## Prerequisites

- Node.js (v16 or higher)
- npm
- Windows (for building Windows installers)

## Quick Build

### Using PowerShell (Recommended)
```powershell
# Build both installer and portable version
.\build-installer.ps1

# Build only the installer
.\build-installer.ps1 -OnlyInstaller

# Build only portable version
.\build-installer.ps1 -OnlyPortable

# Clean build (removes previous builds)
.\build-installer.ps1 -Clean

# Skip dependency installation (faster if deps are up to date)
.\build-installer.ps1 -SkipInstall
```

### Using Batch File
```cmd
# Simple build (both versions)
build-installer.bat
```

### Using npm Scripts
```bash
# Install dependencies first
npm install

# Build both installer and portable
npm run build-all

# Build only NSIS installer
npm run build-installer

# Build only portable version
npm run build-portable

# Build for Windows (directory format)
npm run build-win
```

## Output Files

Built files will be created in the `dist/` directory:

- **`RinaWarp-Terminal-Setup-1.0.0.exe`** - NSIS installer with uninstaller
- **`RinaWarp-Terminal-Portable-1.0.0.exe`** - Portable executable (no installation required)

## Installer Features

### NSIS Installer
- Custom installation directory selection
- Desktop shortcut creation
- Start menu shortcut creation
- Proper uninstaller
- Windows integration

### Portable Version
- No installation required
- Self-contained executable
- Can be run from USB drives
- Leaves no traces on the system

## Configuration

The build configuration is defined in `package.json` under the `build` section:

- **App ID**: `com.rinawarp.terminal.unique`
- **Product Name**: RinaWarp Terminal
- **Executable Name**: rinawarp-terminal
- **Icon**: `assets/icon.ico` (create this file for custom icon)

## Troubleshooting

### Missing Icon
If you see warnings about missing `assets/icon.ico`, create a 256x256 ICO file:
1. Create or convert an image to ICO format
2. Place it at `assets/icon.ico`
3. Rebuild the application

### Build Fails
1. Ensure Node.js and npm are properly installed
2. Run `npm install` to update dependencies
3. Clear npm cache: `npm cache clean --force`
4. Try building with clean flag: `.\build-installer.ps1 -Clean`

### Antivirus False Positives
Some antivirus software may flag the built executable as suspicious. This is common with Electron apps. You may need to:
1. Add exclusions for the build directory
2. Use code signing certificates for production releases

## Distribution

For distributing your application:
1. Test the installer on a clean Windows machine
2. Consider code signing for production releases
3. Host the installer on a reliable download server
4. Provide checksums for security verification

## Advanced Options

See `package.json` build configuration for advanced options like:
- Custom installer UI
- File associations
- Auto-updater integration
- Multiple target architectures

