# Auto-Updater Testing Guide

## Overview

The auto-updater system allows RinaWarp Terminal to automatically check for and install updates. This guide covers setup, testing, and deployment.

## Setup

### 1. Configure Update Server

#### Option A: GitHub Releases (Recommended)
```json
// package.json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "Rinawarp-Terminal",
      "repo": "rinawarp-terminal"
    }
  }
}
```

#### Option B: Generic Server
```json
// package.json
{
  "build": {
    "publish": {
      "provider": "generic",
      "url": "https://updates.rinawarptech.com"
    }
  }
}
```

### 2. Update Server Structure

For generic server, create this structure:
```
https://updates.rinawarptech.com/
├── latest-mac.yml
├── latest-linux.yml
├── latest.yml (Windows)
├── RinaWarp-Terminal-1.0.20-mac.zip
├── RinaWarp-Terminal-1.0.20-mac.dmg
├── RinaWarp-Terminal-1.0.20.exe
└── RinaWarp-Terminal-1.0.20.AppImage
```

### 3. Enable Auto-Updates

Add to `.env`:
```env
ENABLE_AUTO_UPDATES=true
UPDATE_FEED_URL=https://updates.rinawarptech.com
```

## Testing Locally

### 1. Create Test Update Server

Create `test-server/server.js`:
```javascript
const express = require('express');
const path = require('path');
const app = express();

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');
  next();
});

// Serve update files
app.use(express.static(path.join(__dirname, 'updates')));

// Mock latest.yml for Windows
app.get('/latest.yml', (req, res) => {
  res.send(`
version: 1.0.21
files:
  - url: RinaWarp-Terminal-Setup-1.0.21.exe
    sha512: base64hash==
    size: 12345678
path: RinaWarp-Terminal-Setup-1.0.21.exe
sha512: base64hash==
releaseDate: '2025-01-21T12:00:00.000Z'
  `);
});

// Mock latest-mac.yml
app.get('/latest-mac.yml', (req, res) => {
  res.send(`
version: 1.0.21
files:
  - url: RinaWarp-Terminal-1.0.21-mac.zip
    sha512: base64hash==
    size: 12345678
  - url: RinaWarp-Terminal-1.0.21.dmg
    sha512: base64hash==
    size: 12345678
path: RinaWarp-Terminal-1.0.21-mac.zip
sha512: base64hash==
releaseDate: '2025-01-21T12:00:00.000Z'
  `);
});

app.listen(8888, () => {
  console.log('Test update server running on http://localhost:8888');
});
```

### 2. Test Update Flow

```bash
# 1. Build version 1.0.20
npm version 1.0.20
npm run build

# 2. Install and run
./dist/RinaWarp-Terminal.app/Contents/MacOS/RinaWarp\ Terminal

# 3. Build version 1.0.21
npm version 1.0.21
npm run build

# 4. Copy to test server
cp dist/*.exe test-server/updates/
cp dist/*.dmg test-server/updates/
cp dist/*.AppImage test-server/updates/

# 5. Start test server
node test-server/server.js

# 6. Run app with test server
UPDATE_FEED_URL=http://localhost:8888 npm start
```

### 3. Test Scenarios

#### A. Update Available Check
1. Launch older version
2. Check for updates manually
3. Verify dialog appears

#### B. Download Progress
1. Accept update download
2. Monitor progress bar
3. Verify completion

#### C. Install Update
1. After download, click "Restart Now"
2. Verify app restarts with new version

#### D. Decline Update
1. Click "Later" on update dialog
2. Verify app continues normally
3. Check update is offered again later

## UI Integration

### 1. Update Status Component

Create `src/renderer/components/UpdateStatus.js`:
```javascript
class UpdateStatus extends Component {
  constructor() {
    super();
    this.state = {
      checking: false,
      updateAvailable: false,
      downloading: false,
      downloadProgress: 0,
      updateReady: false
    };
  }

  componentDidMount() {
    // Listen for update events
    window.electronAPI.onUpdateAvailable((info) => {
      this.setState({ updateAvailable: true, version: info.version });
    });

    window.electronAPI.onDownloadProgress((progress) => {
      this.setState({ 
        downloading: true, 
        downloadProgress: progress.percent 
      });
    });

    window.electronAPI.onUpdateDownloaded(() => {
      this.setState({ 
        downloading: false, 
        updateReady: true 
      });
    });
  }

  checkForUpdates = async () => {
    this.setState({ checking: true });
    try {
      const result = await window.electronAPI.checkForUpdates();
      if (!result.updateAvailable) {
        this.showMessage('You have the latest version!');
      }
    } finally {
      this.setState({ checking: false });
    }
  };

  render() {
    const { checking, downloading, downloadProgress, updateReady } = this.state;

    if (updateReady) {
      return (
        <div className="update-status ready">
          <span>Update ready!</span>
          <button onClick={() => window.electronAPI.installUpdate()}>
            Restart Now
          </button>
        </div>
      );
    }

    if (downloading) {
      return (
        <div className="update-status downloading">
          <span>Downloading update...</span>
          <progress value={downloadProgress} max="100" />
          <span>{downloadProgress.toFixed(0)}%</span>
        </div>
      );
    }

    return (
      <div className="update-status">
        <button 
          onClick={this.checkForUpdates}
          disabled={checking}
        >
          {checking ? 'Checking...' : 'Check for Updates'}
        </button>
      </div>
    );
  }
}
```

### 2. Settings Integration

Add to settings menu:
```javascript
const settingsMenu = {
  updates: {
    label: 'Updates',
    items: [
      {
        label: 'Check for Updates',
        action: 'check-updates'
      },
      {
        label: 'Auto-download Updates',
        type: 'checkbox',
        checked: settings.autoDownloadUpdates,
        action: 'toggle-auto-download'
      }
    ]
  }
};
```

## Production Deployment

### 1. GitHub Releases

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build and publish
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CSC_LINK: ${{ secrets.CSC_LINK }}
          CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
        run: npm run build -- --publish always
```

### 2. Custom Server

Deploy script for custom server:
```javascript
// scripts/deploy-updates.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function generateYaml(version, files) {
  const yaml = {
    version,
    releaseDate: new Date().toISOString(),
    files: files.map(file => ({
      url: path.basename(file),
      sha512: calculateSha512(file),
      size: fs.statSync(file).size
    }))
  };
  
  return yaml;
}

function calculateSha512(file) {
  const hash = crypto.createHash('sha512');
  const data = fs.readFileSync(file);
  hash.update(data);
  return hash.digest('base64');
}

// Deploy to server
async function deploy() {
  // Generate YAML files
  // Upload to server
  // Invalidate CDN cache
}
```

## Troubleshooting

### Common Issues

1. **Certificate validation errors**
   - Ensure code signing is properly configured
   - Check certificate trust chain

2. **Network errors**
   - Verify update server is accessible
   - Check firewall/proxy settings

3. **Permission errors**
   - Ensure app has write permissions
   - Check antivirus software

### Debug Mode

Enable debug logging:
```javascript
// main.js
if (process.env.DEBUG_UPDATER) {
  autoUpdater.logger = require('electron-log');
  autoUpdater.logger.transports.file.level = 'debug';
}
```

### Test Commands

```bash
# Test with specific update URL
UPDATE_FEED_URL=https://test.server/updates npm start

# Test with debug logging
DEBUG_UPDATER=true npm start

# Test specific version
npm start -- --test-version=1.0.19
```

## Security Considerations

1. **Always sign updates** - Unsigned updates will be rejected
2. **Use HTTPS** - Update server must use SSL
3. **Verify checksums** - SHA512 hashes are verified automatically
4. **Differential updates** - Only download changed files

## Rollback Strategy

If an update causes issues:

1. Keep previous versions available
2. Implement rollback mechanism:
```javascript
// Emergency rollback
if (process.argv.includes('--rollback')) {
  const previousVersion = settings.get('previousVersion');
  if (previousVersion) {
    // Download and install previous version
  }
}
```

## Metrics and Monitoring

Track update success:
```javascript
// Track update events
analytics.track('update_check', { 
  currentVersion, 
  updateAvailable 
});

analytics.track('update_download', { 
  version, 
  duration 
});

analytics.track('update_install', { 
  version, 
  success 
});
```
