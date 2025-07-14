# Build and Release Process

This document outlines the complete build and release process for RinaWarp Terminal.

## Overview

The project uses a comprehensive build and release system that supports:
- ✅ Cross-platform builds (macOS, Windows, Linux)
- 🤖 Automated release creation
- 📦 Proper artifact naming with version, architecture, and date
- 🔄 GitHub Actions CI/CD integration
- 📝 Automatic changelog generation

## Quick Start

### Local Development Builds

```bash
# Build for current platform
npm run build

# Build for specific platforms
npm run build:mac      # macOS
npm run build:win      # Windows
npm run build:linux    # Linux
npm run build:all      # All platforms
```

### Release Management

```bash
# Check current status
npm run release:status

# Create releases
npm run release:patch     # 1.0.0 -> 1.0.1
npm run release:minor     # 1.0.0 -> 1.1.0
npm run release:major     # 1.0.0 -> 2.0.0

# Test releases (dry run)
npm run release:dry-run
```

## Build Scripts

### Platform-Specific Build Scripts

| Script | Platform | Output | Location |
|--------|----------|---------|----------|
| `build-mac.cjs` | macOS | `.zip` | `scripts/build-mac.cjs` |
| `build-windows.cjs` | Windows | `.exe` | `scripts/build-windows.cjs` |
| `build-linux.cjs` | Linux | `.AppImage` | `scripts/build-linux.cjs` |

### Build Output Naming Convention

All build artifacts follow this naming pattern:
```
RinaWarp-Terminal-{version}-{platform}-{arch}-{date}.{ext}
```

Examples:
- `RinaWarp-Terminal-1.0.8-mac-arm64-2025-01-14.zip`
- `RinaWarp-Terminal-1.0.8-win-x64-2025-01-14.exe`
- `RinaWarp-Terminal-1.0.8-linux-x64-2025-01-14.AppImage`

### Key Features

1. **Architecture Detection**: Automatically detects ARM64 vs x64 architecture
2. **Error Handling**: Comprehensive error reporting and debugging
3. **Artifact Verification**: Checks that build outputs are created successfully
4. **Size Reporting**: Reports final artifact sizes
5. **Cleanup**: Automatic cleanup of build directories

## Release Automation

### GitHub Actions Workflows

#### 1. Manual Release Workflow (`.github/workflows/release.yml`)

**Trigger**: Manual dispatch with options
**Features**:
- Version bump selection (patch/minor/major/prerelease)
- Dry run mode for testing
- Automatic changelog generation
- Cross-platform builds
- GitHub release creation

**Usage**:
1. Go to Actions tab in GitHub
2. Select "Automated Release"
3. Click "Run workflow"
4. Choose version bump type
5. Optionally enable dry run for testing

#### 2. Build and Release Workflow (`.github/workflows/build-release.yml`)

**Trigger**: Git tags or manual dispatch
**Features**:
- Cross-platform builds
- Artifact upload
- Release creation for tagged commits

### Local Release Script

The `scripts/release.cjs` script provides comprehensive release management:

```bash
# Show help
node scripts/release.cjs help

# Check current status
node scripts/release.cjs status

# Generate changelog
node scripts/release.cjs changelog

# Create releases
node scripts/release.cjs patch
node scripts/release.cjs minor --dry-run
```

## Configuration

### Electron Builder Configuration

Located in `package.json` under the `build` section:

```json
{
  "build": {
    "productName": "RinaWarp Terminal",
    "appId": "com.rinawarp.terminal",
    "directories": {
      "output": "dist",
      "buildResources": "assets"
    },
    "win": {
      "target": [{"target": "nsis", "arch": ["x64"]}],
      "icon": "assets/icon.ico"
    },
    "mac": {
      "target": [{"target": "zip", "arch": "x64"}],
      "icon": "assets/icon.icns",
      "identity": null,
      "notarize": false
    },
    "linux": {
      "target": [{"target": "AppImage", "arch": ["x64"]}],
      "icon": "assets/icon.png",
      "category": "Development"
    }
  }
}
```

### Environment Variables

The following environment variables are used during builds:

```bash
# CI/CD Settings
CI=true
DEBUG=electron-builder
ELECTRON_BUILDER_ALLOW_UNRESOLVED_DEPENDENCIES=true

# Code Signing (disabled for now)
CSC_IDENTITY_AUTO_DISCOVERY=false
CSC_LINK=""
CSC_KEY_PASSWORD=""
NOTARIZE="false"
SIGN="false"

# Apple-specific (for future code signing)
APPLE_ID=""
APPLE_ID_PASSWORD=""
APPLE_TEAM_ID=""
```

## Development Workflow

### Making Changes

1. **Make your changes** in the codebase
2. **Test locally**:
   ```bash
   npm run build:mac  # Test on your platform
   ```
3. **Commit changes**:
   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```
4. **Push to GitHub**:
   ```bash
   git push origin main
   ```

### Creating a Release

1. **Check status**:
   ```bash
   npm run release:status
   ```

2. **Test release** (dry run):
   ```bash
   npm run release:dry-run
   ```

3. **Create release**:
   ```bash
   npm run release:patch  # or minor/major
   ```

4. **Monitor build**: Check GitHub Actions for build progress

5. **Publish release**: The release will be created as a draft, review and publish it

## Troubleshooting

### Common Issues

#### 1. Build Failures

**Issue**: Electron builder fails to create artifacts
**Solution**: 
- Check that all dependencies are installed
- Verify icon files exist in `assets/` directory
- Review build logs for specific error messages

#### 2. Architecture Detection

**Issue**: Wrong architecture in filename
**Solution**: 
- macOS: Architecture auto-detected from electron-builder output directory
- Windows/Linux: Currently assumes x64, can be enhanced for ARM64

#### 3. Code Signing

**Issue**: Code signing warnings
**Solution**: 
- Code signing is currently disabled for development
- For production, configure proper certificates in environment variables

#### 4. Release Script Failures

**Issue**: Git operations fail
**Solution**:
- Ensure working directory is clean
- Check git remote configuration
- Verify GitHub token permissions

### Debug Mode

Enable debug mode for builds:

```bash
DEBUG=electron-builder npm run build:mac
```

### Log Files

Build logs are available in:
- GitHub Actions: Actions tab → Select workflow run → View logs
- Local builds: Terminal output during build process

## Future Enhancements

### Planned Features

1. **Code Signing**:
   - Apple Developer certificate integration
   - Windows Authenticode signing
   - Linux AppImage signing

2. **Multi-Architecture Support**:
   - ARM64 support for Windows and Linux
   - Universal binaries for macOS

3. **Advanced Release Features**:
   - Automatic release notes from commit messages
   - Release candidate builds
   - Rollback capabilities

4. **Performance Optimizations**:
   - Parallel builds
   - Build caching
   - Incremental builds

### Contributing

When contributing to the build system:

1. Test changes locally first
2. Use dry run mode for testing release scripts
3. Document any new environment variables
4. Update this documentation for new features

## Support

For build and release issues:
1. Check this documentation
2. Review GitHub Actions logs
3. Test with dry run mode
4. Create an issue with full error logs
