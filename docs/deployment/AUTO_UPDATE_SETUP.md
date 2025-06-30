# 🚀 Auto-Update Setup Guide for RinaWarp Terminal

## Overview
RinaWarp Terminal now includes automatic update functionality using `electron-updater`. This ensures users always have the latest features and security updates.

## 🔧 **Setup Requirements**

### 1. GitHub Repository Setup
```bash
# Create GitHub repository
gh repo create rinawarp/terminal --public --description "RinaWarp Terminal - Advanced AI Terminal"

# Set up repository secrets for releases
gh secret set GH_TOKEN --body "your_github_token_here"
```

### 2. Install Dependencies
```bash
npm install electron-updater --save-dev
```

### 3. Configuration (Already Done)
- ✅ `package.json` updated with publish configuration
- ✅ `src/main.js` updated with auto-updater integration
- ✅ Auto-update event handlers implemented

## 📦 **Release Process**

### Automatic Releases (Recommended)
```bash
# Build and publish to GitHub releases
npm run release

# This will:
# 1. Build the app
# 2. Create GitHub release
# 3. Upload release assets
# 4. Generate update metadata
```

### Manual Releases
```bash
# 1. Update version in package.json
npm version patch  # or minor/major

# 2. Build the app
npm run build

# 3. Create GitHub release manually
gh release create v1.0.3 dist/*.exe dist/*.yml --title "RinaWarp Terminal v1.0.3" --notes "Bug fixes and improvements"
```

## 🔄 **How Auto-Updates Work**

### For Users
1. App checks for updates on startup
2. If update is available, user gets notification
3. Update downloads in background
4. User can choose to restart now or later
5. App updates automatically

### Update Flow
```
App Startup → Check for Updates → Download Update → Notify User → Restart & Install
```

## 📁 **Required Files for Updates**

### GitHub Releases Must Include:
- `RinaWarp Terminal Setup 1.0.x.exe` (Windows installer)
- `latest.yml` (Update metadata for Windows)
- `latest-mac.yml` (Update metadata for macOS)
- `latest-linux.yml` (Update metadata for Linux)

### Update Metadata Example (`latest.yml`):
```yaml
version: 1.0.3
files:
  - url: RinaWarp Terminal Setup 1.0.3.exe
    sha512: [checksum]
    size: 85123456
path: RinaWarp Terminal Setup 1.0.3.exe
sha512: [checksum]
releaseDate: '2025-06-27T10:00:00.000Z'
```

## 🛡️ **Security Considerations**

### Code Signing (Recommended for Production)
```javascript
// In package.json build config
"win": {
  "certificateFile": "path/to/certificate.p12",
  "certificatePassword": "password",
  "publisherName": "RinaWarp Technologies"
}
```

### Secure Updates
- ✅ Updates are verified with checksums
- ✅ HTTPS-only download sources
- ✅ Signature verification (if code signed)

## 📊 **Testing Auto-Updates**

### Development Testing
```bash
# 1. Create test release with higher version
npm version prerelease --preid=test

# 2. Build and publish test release
npm run release

# 3. Run app with current version
npm start

# 4. App should detect and offer update
```

### Staging Environment
1. Set up separate GitHub repository for testing
2. Configure app to use staging repository
3. Test update flow thoroughly

## 🚨 **Troubleshooting**

### Common Issues

#### Update Check Fails
```javascript
// Debug auto-updater
autoUpdater.logger = require("electron-log");
autoUpdater.logger.transports.file.level = "info";
```

#### GitHub Token Issues
```bash
# Verify token permissions
gh auth status

# Token needs: repo, read:packages, write:packages
```

#### Network/Firewall Issues
- Ensure app can access GitHub releases
- Check corporate firewall settings
- Verify HTTPS connectivity

### Manual Update Check
```javascript
// In renderer process
ipcRenderer.invoke('check-for-updates');
```

## 🔧 **Advanced Configuration**

### Custom Update Server
```javascript
// In main.js
autoUpdater.setFeedURL({
  provider: 'generic',
  url: 'https://your-update-server.com/updates'
});
```

### Update Channels
```javascript
// Different channels for different user types
autoUpdater.channel = 'beta'; // or 'stable', 'alpha'
```

### Silent Updates
```javascript
// Auto-install without user prompt (use carefully)
autoUpdater.autoInstallOnAppQuit = true;
```

## 📈 **Monitoring Updates**

### Analytics Integration
```javascript
// Track update events
analytics.track('update_available', { version: info.version });
analytics.track('update_downloaded', { version: info.version });
analytics.track('update_installed', { version: info.version });
```

### Error Reporting
```javascript
autoUpdater.on('error', (error) => {
  errorReporting.captureException(error);
});
```

## ✅ **Deployment Checklist**

- [ ] GitHub repository created
- [ ] Auto-updater configured in app
- [ ] Release process tested
- [ ] Code signing set up (optional)
- [ ] Update flow tested with users
- [ ] Monitoring and analytics in place
- [ ] Rollback plan prepared

## 🚀 **Next Steps**

1. **Set up GitHub repository**: `gh repo create rinawarp/terminal`
2. **Create first release**: `npm run release`
3. **Test update flow**: Install older version, test update
4. **Set up monitoring**: Track update success rates
5. **Plan release schedule**: Regular updates build trust

Your auto-update system is now ready! Users will automatically receive new versions, improving adoption and reducing support burden.
