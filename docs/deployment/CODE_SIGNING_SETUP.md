# 🔐 Code Signing Setup for RinaWarp Terminal

## Overview
This guide covers setting up code signing certificates for all platforms to ensure your application is trusted by operating systems and app stores.

## 🍎 **macOS Code Signing**

### Developer Account Setup
1. **Apple Developer Program**
   - Cost: $99/year
   - Sign up at: https://developer.apple.com/programs/
   - Required for Mac App Store and notarization

2. **Certificate Types Needed**
   - **Developer ID Application**: For direct distribution
   - **Mac App Store**: For App Store distribution
   - **Developer ID Installer**: For PKG installers

### Certificate Creation & Installation

#### Step 1: Create Certificates
```bash
# Using Xcode (Recommended)
1. Open Xcode
2. Go to Xcode > Preferences > Accounts
3. Add your Apple ID
4. Select your team
5. Click "Manage Certificates"
6. Click "+" and create certificates

# Or use command line
security find-identity -v -p codesigning
```

#### Step 2: Export Certificates
```bash
# Export Developer ID Application certificate
security find-identity -v -p codesigning
security export -k login.keychain -t identities -f pkcs12 -o developer_id.p12

# Set password for certificate
# Remember this password for electron-builder configuration
```

#### Step 3: Configure electron-builder
```json
{
  "build": {
    "mac": {
      "hardenedRuntime": true,
      "entitlements": "build/entitlements.mac.plist",
      "entitlementsInherit": "build/entitlements.mac.inherit.plist",
      "gatekeeperAssess": false,
      "identity": "Developer ID Application: Your Name (TEAM_ID)"
    },
    "afterSign": "scripts/notarize.js"
  }
}
```

### Entitlements Files

#### entitlements.mac.plist
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-jit</key>
  <true/>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
  <key>com.apple.security.cs.debugger</key>
  <true/>
  <key>com.apple.security.cs.disable-library-validation</key>
  <true/>
  <key>com.apple.security.network.client</key>
  <true/>
  <key>com.apple.security.network.server</key>
  <true/>
  <key>com.apple.security.files.user-selected.read-write</key>
  <true/>
  <key>com.apple.security.files.downloads.read-write</key>
  <true/>
</dict>
</plist>
```

#### entitlements.mac.inherit.plist
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-jit</key>
  <true/>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
  <key>com.apple.security.cs.debugger</key>
  <true/>
  <key>com.apple.security.cs.disable-library-validation</key>
  <true/>
</dict>
</plist>
```

### Notarization Setup

#### notarize.js Script
```javascript
import { notarize } from 'electron-notarize';

export default async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  
  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  
  return await notarize({
    appBundleId: 'com.rinawarp.terminal',
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_ID_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
  });
}
```

#### Environment Variables
```bash
# .env file
APPLE_ID=your-apple-id@email.com
APPLE_ID_PASSWORD=app-specific-password
APPLE_TEAM_ID=your-team-id
CSC_LINK=path/to/developer_id.p12
CSC_KEY_PASSWORD=certificate-password
```

### App-Specific Password
```bash
# Create app-specific password
1. Go to appleid.apple.com
2. Sign in with your Apple ID
3. Go to Security section
4. Generate app-specific password
5. Label it "RinaWarp Terminal Notarization"
6. Use this password for APPLE_ID_PASSWORD
```

## 🪟 **Windows Code Signing**

### Certificate Options

#### Option 1: Extended Validation (EV) Certificate (Recommended)
- **Cost**: $300-500/year
- **Providers**: Sectigo, DigiCert, GlobalSign
- **Benefits**: Immediate SmartScreen reputation
- **Requirements**: Business verification

#### Option 2: Standard Code Signing Certificate
- **Cost**: $100-200/year
- **Providers**: Sectigo, Comodo, DigiCert
- **Benefits**: Basic code signing
- **Note**: Takes time to build SmartScreen reputation

### Certificate Purchase & Setup

#### Step 1: Purchase Certificate
```bash
# Recommended providers:
# - DigiCert: https://www.digicert.com/code-signing/
# - Sectigo: https://sectigo.com/ssl-certificates-tls/code-signing
# - GlobalSign: https://www.globalsign.com/en/code-signing-certificate/

# Requirements for business verification:
# - Business registration documents
# - Phone verification
# - Address verification
# - Authorized representative verification
```

#### Step 2: Install Certificate
```powershell
# After receiving certificate file (.p12 or .pfx)
# Import into Windows Certificate Store

# Using PowerShell
$cert = Import-PfxCertificate -FilePath "certificate.p12" -CertStoreLocation "Cert:\CurrentUser\My" -Password (ConvertTo-SecureString "password" -AsPlainText -Force)

# Or use Certificate Manager (certmgr.msc)
1. Open Certificate Manager
2. Navigate to Personal > Certificates
3. Right-click > All Tasks > Import
4. Select your .p12/.pfx file
5. Enter password
6. Import to Personal store
```

#### Step 3: Configure electron-builder
```json
{
  "build": {
    "win": {
      "target": [
        {
          "target": "nsis",
          "arch": ["x64"]
        }
      ],
      "certificateFile": "certs/certificate.p12",
      "certificatePassword": "certificate_password",
      "publisherName": "RinaWarp Technologies",
      "verifyUpdateCodeSignature": true,
      "timeStampServer": "http://timestamp.digicert.com",
      "rfc3161TimeStampServer": "http://timestamp.digicert.com"
    }
  }
}
```

### Environment Variables for CI/CD
```bash
# GitHub Actions Secrets
WIN_CSC_LINK=base64_encoded_certificate
WIN_CSC_KEY_PASSWORD=certificate_password

# In GitHub Actions workflow
- name: Decode certificate
  run: echo "${{ secrets.WIN_CSC_LINK }}" | base64 --decode > certificate.p12
  
- name: Build Windows
  run: npm run build:win
  env:
    WIN_CSC_LINK: certificate.p12
    WIN_CSC_KEY_PASSWORD: ${{ secrets.WIN_CSC_KEY_PASSWORD }}
```

### SmartScreen Reputation
```bash
# Building SmartScreen reputation:
1. Sign all executables consistently
2. Distribute through legitimate channels
3. Maintain low complaint rates
4. Submit files to Microsoft for analysis
5. Monitor Windows Defender reports

# Submit to Microsoft
https://www.microsoft.com/en-us/wdsi/filesubmission
```

## 🐧 **Linux Code Signing (GPG)**

### GPG Key Creation
```bash
# Generate GPG key
gpg --full-generate-key

# Select options:
# 1. RSA and RSA (default)
# 2. 4096 bits
# 3. Key does not expire (or set expiration)
# 4. Enter your name and email
# 5. Create secure passphrase

# Export public key
gpg --armor --export your-email@domain.com > public.key

# Export private key (keep secure!)
gpg --armor --export-secret-keys your-email@domain.com > private.key
```

### AppImage Signing
```bash
# Sign AppImage
gpg --detach-sign --armor RinaWarp-Terminal-1.0.2.AppImage

# Verify signature
gpg --verify RinaWarp-Terminal-1.0.2.AppImage.asc RinaWarp-Terminal-1.0.2.AppImage
```

### Debian Package Signing
```bash
# Sign .deb package
dpkg-sig --sign builder rinawarp-terminal_1.0.2_amd64.deb

# Create repository with signed packages
# Update Release file with GPG signature
```

### RPM Package Signing
```bash
# Configure RPM signing
echo "%_gpg_name Your Name" >> ~/.rpmmacros
echo "%_signature gpg" >> ~/.rpmmacros

# Sign RPM package
rpm --addsign rinawarp-terminal-1.0.2-1.x86_64.rpm

# Verify signature
rpm --checksig rinawarp-terminal-1.0.2-1.x86_64.rpm
```

## 🤖 **Automated Signing in CI/CD**

### GitHub Actions Workflow
```yaml
name: Build and Sign

on:
  push:
    tags: ['v*']

jobs:
  build-and-sign:
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]
    
    runs-on: ${{ matrix.os }}
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm install
    
    # macOS signing
    - name: Setup macOS signing
      if: matrix.os == 'macos-latest'
      run: |
        echo "${{ secrets.MAC_CERT_P12 }}" | base64 --decode > certificate.p12
        security create-keychain -p "${{ secrets.MAC_KEYCHAIN_PASSWORD }}" build.keychain
        security default-keychain -s build.keychain
        security unlock-keychain -p "${{ secrets.MAC_KEYCHAIN_PASSWORD }}" build.keychain
        security import certificate.p12 -k build.keychain -P "${{ secrets.MAC_CERT_PASSWORD }}" -T /usr/bin/codesign
        security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "${{ secrets.MAC_KEYCHAIN_PASSWORD }}" build.keychain
      env:
        APPLE_ID: ${{ secrets.APPLE_ID }}
        APPLE_ID_PASSWORD: ${{ secrets.APPLE_ID_PASSWORD }}
        APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
    
    # Windows signing
    - name: Setup Windows signing
      if: matrix.os == 'windows-latest'
      run: |
        echo "${{ secrets.WIN_CERT_P12 }}" | base64 --decode > certificate.p12
      env:
        WIN_CSC_LINK: certificate.p12
        WIN_CSC_KEY_PASSWORD: ${{ secrets.WIN_CERT_PASSWORD }}
    
    # Linux signing
    - name: Setup Linux signing
      if: matrix.os == 'ubuntu-latest'
      run: |
        echo "${{ secrets.GPG_PRIVATE_KEY }}" | gpg --import
        echo "${{ secrets.GPG_PASSPHRASE }}" | gpg --batch --yes --passphrase-fd 0 --trust-model always --sign test.txt
    
    - name: Build application
      run: npm run build
    
    - name: Upload artifacts
      uses: actions/upload-artifact@v3
      with:
        name: ${{ matrix.os }}-builds
        path: dist/
```

## 🔒 **Security Best Practices**

### Certificate Storage
```bash
# DO NOT commit certificates to version control
# Add to .gitignore:
*.p12
*.pfx
*.key
certificate.*
secrets/
.env

# Use environment variables or CI/CD secrets
# Encrypt certificates when storing
```

### Key Management
```bash
# Rotate certificates before expiration
# Keep backup certificates in secure location
# Use separate certificates for different environments
# Monitor certificate expiration dates

# Set up alerts for certificate expiration
# Automate certificate renewal where possible
```

### Access Control
```bash
# Limit access to signing certificates
# Use dedicated signing machines/environments
# Implement approval workflows for releases
# Log all signing activities
# Regular security audits
```

## 📋 **Signing Verification**

### Verify macOS Signing
```bash
# Check code signature
codesign -dv --verbose=4 "RinaWarp Terminal.app"

# Verify notarization
spctl -a -t exec -vv "RinaWarp Terminal.app"

# Check Gatekeeper assessment
spctl --assess --verbose "RinaWarp Terminal.app"
```

### Verify Windows Signing
```powershell
# Check digital signature
Get-AuthenticodeSignature "RinaWarp-Terminal-Setup.exe"

# Verify with signtool
signtool verify /pa /v "RinaWarp-Terminal-Setup.exe"

# Check timestamp
signtool verify /pa /v /t "RinaWarp-Terminal-Setup.exe"
```

### Verify Linux Signing
```bash
# Verify GPG signature
gpg --verify RinaWarp-Terminal-1.0.2.AppImage.asc

# Check package signatures
dpkg-sig --verify rinawarp-terminal_1.0.2_amd64.deb
rpm --checksig rinawarp-terminal-1.0.2-1.x86_64.rpm
```

## 🚨 **Troubleshooting**

### Common macOS Issues
```bash
# "Developer cannot be verified" error
# Solution: App not notarized or Gatekeeper settings

# "Damaged and can't be opened" error
# Solution: Quarantine attribute issue
xattr -cr "RinaWarp Terminal.app"

# Notarization failures
# Check entitlements and hardened runtime settings
# Verify Apple ID app-specific password
```

### Common Windows Issues
```bash
# "Unknown publisher" warning
# Solution: Need to build SmartScreen reputation
# Submit to Microsoft for analysis

# Timestamp failures
# Solution: Check internet connectivity during signing
# Use reliable timestamp servers

# Certificate not found
# Solution: Verify certificate installation in correct store
```

### Common Linux Issues
```bash
# GPG signature verification fails
# Solution: Import correct public key
# Check key expiration dates

# Package manager warnings
# Solution: Add repository GPG key to trusted keys
# Verify package integrity
```

## 📈 **Monitoring & Maintenance**

### Certificate Monitoring
```bash
# Set up monitoring for:
# - Certificate expiration dates
# - Signing success rates
# - User feedback on trust warnings
# - Download success rates

# Tools:
# - Certificate transparency logs
# - Signing service dashboards
# - User analytics
# - Support ticket analysis
```

### Renewal Process
```bash
# 30 days before expiration:
# 1. Purchase new certificate
# 2. Test signing with new certificate
# 3. Update CI/CD configuration
# 4. Deploy with new certificate
# 5. Monitor for issues

# Keep old certificate for:
# - Verifying old releases
# - Transition period overlap
# - Emergency fallback
```

Your code signing setup is now complete! Properly signed applications will be trusted by operating systems and provide a better user experience with fewer security warnings.
