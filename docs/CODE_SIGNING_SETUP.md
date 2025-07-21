# Code Signing Setup Guide for RinaWarp Terminal

## macOS Code Signing

### Prerequisites
1. Apple Developer Account ($99/year)
2. Xcode installed
3. Valid macOS Developer ID Application certificate

### Steps to Set Up macOS Code Signing

#### 1. Create Apple Developer Account
- Go to https://developer.apple.com
- Enroll in the Apple Developer Program
- Wait for approval (usually 24-48 hours)

#### 2. Create Certificates
```bash
# In Xcode:
# 1. Open Xcode → Preferences → Accounts
# 2. Add your Apple ID
# 3. Manage Certificates → Create "Developer ID Application" certificate
```

#### 3. Export Certificate
```bash
# Export from Keychain Access:
# 1. Open Keychain Access
# 2. Find "Developer ID Application: Your Name"
# 3. Right-click → Export
# 4. Save as .p12 file with password
```

#### 4. Configure electron-builder
Create or update `electron-builder.env`:
```env
# macOS Signing
CSC_LINK=path/to/certificate.p12
CSC_KEY_PASSWORD=your_certificate_password
APPLE_ID=your@apple.id
APPLE_ID_PASSWORD=your_app_specific_password
```

#### 5. Update package.json
```json
{
  "build": {
    "mac": {
      "category": "public.app-category.developer-tools",
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements": "build/entitlements.mac.plist",
      "entitlementsInherit": "build/entitlements.mac.plist",
      "notarize": {
        "teamId": "YOUR_TEAM_ID"
      }
    }
  }
}
```

#### 6. Create Entitlements File
`build/entitlements.mac.plist`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-dyld-environment-variables</key>
    <true/>
    <key>com.apple.security.device.microphone</key>
    <true/>
</dict>
</plist>
```

---

## Windows Code Signing

### Prerequisites
1. Code Signing Certificate from trusted CA (DigiCert, Sectigo, etc.)
2. Windows SDK installed

### Steps to Set Up Windows Code Signing

#### 1. Purchase Certificate
- Recommended: DigiCert EV Code Signing Certificate (~$499/year)
- Alternative: Sectigo/Comodo (~$179/year)

#### 2. Configure electron-builder
Update `electron-builder.env`:
```env
# Windows Signing
CSC_LINK=path/to/certificate.pfx
CSC_KEY_PASSWORD=your_certificate_password
```

#### 3. Update package.json
```json
{
  "build": {
    "win": {
      "certificateFile": "path/to/certificate.pfx",
      "certificatePassword": "${env.CSC_KEY_PASSWORD}",
      "verifyUpdateCodeSignature": true,
      "signingHashAlgorithms": ["sha256"],
      "sign": "./build/customSign.js"
    }
  }
}
```

#### 4. Custom Sign Script (Optional)
`build/customSign.js`:
```javascript
exports.default = async function(configuration) {
  // Custom signing logic if needed
  console.log("Signing", configuration.path);
  // Use signtool.exe or other signing tools
};
```

---

## Testing Code Signing

### macOS
```bash
# Build and sign
npm run build:mac

# Verify signature
codesign --verify --deep --strict --verbose=2 dist/mac/RinaWarp\ Terminal.app

# Check notarization
spctl -a -t exec -vvv dist/mac/RinaWarp\ Terminal.app
```

### Windows
```bash
# Build and sign
npm run build:win

# Verify signature (in PowerShell)
Get-AuthenticodeSignature "dist\RinaWarp Terminal Setup.exe"
```

---

## Automation Script

Create `scripts/setup-signing.js`:
```javascript
const fs = require('fs');
const path = require('path');

function setupSigning() {
  // Check for certificates
  const config = {
    mac: {
      certificate: process.env.CSC_LINK,
      password: process.env.CSC_KEY_PASSWORD,
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_ID_PASSWORD
    },
    win: {
      certificate: process.env.WIN_CSC_LINK,
      password: process.env.WIN_CSC_KEY_PASSWORD
    }
  };

  // Validate configuration
  if (process.platform === 'darwin' && !config.mac.certificate) {
    console.error('❌ macOS certificate not found. Please set CSC_LINK environment variable.');
    process.exit(1);
  }

  if (process.platform === 'win32' && !config.win.certificate) {
    console.error('❌ Windows certificate not found. Please set WIN_CSC_LINK environment variable.');
    process.exit(1);
  }

  console.log('✅ Code signing configured successfully');
}

if (require.main === module) {
  setupSigning();
}

module.exports = { setupSigning };
```

---

## CI/CD Integration

### GitHub Actions Example
`.github/workflows/build.yml`:
```yaml
name: Build and Sign

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    strategy:
      matrix:
        os: [macos-latest, windows-latest]
    
    runs-on: ${{ matrix.os }}
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build and Sign
        env:
          CSC_LINK: ${{ secrets.MAC_CERTIFICATE }}
          CSC_KEY_PASSWORD: ${{ secrets.MAC_CERTIFICATE_PASSWORD }}
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_ID_PASSWORD: ${{ secrets.APPLE_ID_PASSWORD }}
          WIN_CSC_LINK: ${{ secrets.WIN_CERTIFICATE }}
          WIN_CSC_KEY_PASSWORD: ${{ secrets.WIN_CERTIFICATE_PASSWORD }}
        run: npm run build
        
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: ${{ matrix.os }}-build
          path: dist/
```

---

## Cost Summary

- **macOS**: $99/year (Apple Developer Program)
- **Windows**: $179-499/year (Code Signing Certificate)
- **Total**: ~$278-598/year

## Next Steps

1. Create developer accounts
2. Purchase certificates
3. Configure environment variables
4. Test signing locally
5. Set up CI/CD automation
