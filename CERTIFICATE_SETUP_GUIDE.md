# 🔐 Certificate Setup Guide - RinaWarp Terminal

## 🎯 **Certificate Priority Order**

### 1. **Windows Code Signing Certificate** (START HERE)
**Why First**: You're on Windows, longest processing time, most critical for distribution

### 2. **Apple Developer Account** (PARALLEL)
**Why Second**: 24-48 hour approval, needed for macOS builds

### 3. **Linux GPG Keys** (LAST)
**Why Last**: Free, instant, can be done anytime

## 🪟 **Windows Code Signing Certificate Setup**

### **Step 1: Choose Certificate Provider**

#### **Option A: DigiCert (Recommended)**
- **Cost**: $474/year (EV Certificate)
- **Benefits**: Immediate SmartScreen reputation, trusted CA
- **Processing**: 1-3 business days
- **Link**: https://www.digicert.com/code-signing/

#### **Option B: Sectigo (Budget Option)**
- **Cost**: $199/year (Standard) or $399/year (EV)
- **Benefits**: Lower cost, same trust level
- **Processing**: 1-5 business days
- **Link**: https://sectigo.com/ssl-certificates-tls/code-signing

#### **Option C: GlobalSign**
- **Cost**: $249/year (Standard) or $599/year (EV)
- **Benefits**: Global presence, good support
- **Processing**: 2-5 business days
- **Link**: https://www.globalsign.com/en/code-signing-certificate/

### **Step 2: Prepare Business Information**

**You'll Need:**
```
Business Information:
- Legal business name: "Your Business Name"
- Business address (must be verifiable)
- Phone number (will be called for verification)
- DUNS number (if you have one)
- Business registration documents

Personal Information:
- Full legal name
- Address matching business registration
- Phone number
- Email address
- Government-issued ID

Technical Information:
- Certificate Common Name: "Your Business Name"
- Organization: "Your Business Name" 
- Country: US (or your country)
- Key Size: 2048 or 4096 bit
```

### **Step 3: Start Certificate Order**

#### **DigiCert Process:**
1. Go to https://www.digicert.com/code-signing/
2. Click "Order Now" for EV Code Signing Certificate
3. Fill out business information
4. Upload business verification documents
5. Pay $474 for 1 year
6. Wait for verification call (1-3 days)

#### **What Happens Next:**
- DigiCert will call your business phone number
- They'll verify your identity and business
- You'll receive certificate via email
- Certificate comes as `.p12` file with password

### **Step 4: Test Certificate Installation**

Once you receive the certificate:

```powershell
# Import certificate to Windows Certificate Store
$password = Read-Host "Enter certificate password" -AsSecureString
Import-PfxCertificate -FilePath "path\to\your\certificate.p12" -CertStoreLocation "Cert:\CurrentUser\My" -Password $password

# Verify certificate is installed
Get-ChildItem -Path "Cert:\CurrentUser\My" | Where-Object {$_.Subject -like "*Your Business Name*"}
```

## 🍎 **Apple Developer Account Setup**

### **Step 1: Apply for Account**
1. Go to https://developer.apple.com/programs/
2. Click "Enroll"
3. Choose "Individual" or "Organization"
4. Fill out application
5. Pay $99 fee
6. Wait 24-48 hours for approval

### **Step 2: After Approval**
```bash
# Install Xcode (required for certificate management)
# Download from Mac App Store or developer.apple.com

# Generate certificates through Xcode
# 1. Open Xcode
# 2. Go to Preferences > Accounts
# 3. Add your Apple ID
# 4. Select your team
# 5. Click "Manage Certificates"
# 6. Create "Developer ID Application" certificate
```

### **Step 3: Export Certificate**
```bash
# Export from Keychain Access
# 1. Open Keychain Access
# 2. Find your Developer ID Application certificate
# 3. Right-click > Export
# 4. Save as .p12 file with strong password
# 5. Store securely for CI/CD
```

## 🐧 **Linux GPG Key Setup**

### **Generate GPG Key**
```bash
# Generate new GPG key
gpg --full-generate-key

# Select options:
# 1. RSA and RSA (default)
# 2. 4096 bits
# 3. Key does not expire (or set expiration)
# 4. Enter your name and email
# 5. Create secure passphrase

# Export public key
gpg --armor --export your-email@domain.com > rinawarp-public.key

# Export private key (keep secure!)
gpg --armor --export-secret-keys your-email@domain.com > rinawarp-private.key

# Get key ID
gpg --list-secret-keys --keyid-format LONG
```

## ⚙️ **Configure Certificates in Project**

### **Update package.json**
```json
{
  "build": {
    "win": {
      "certificateFile": "certs/windows-certificate.p12",
      "certificatePassword": "env:WIN_CERT_PASSWORD",
      "publisherName": "Your Business Name",
      "timeStampServer": "http://timestamp.digicert.com"
    },
    "mac": {
      "identity": "Developer ID Application: Your Name (TEAM_ID)",
      "hardenedRuntime": true,
      "entitlements": "build/entitlements.mac.plist",
      "entitlementsInherit": "build/entitlements.mac.inherit.plist"
    }
  }
}
```

### **Create Certificate Directory**
```bash
mkdir certs
# Copy your certificates here (DO NOT commit to git)
# Add certs/ to .gitignore
```

### **Update .gitignore**
```gitignore
# Certificates and secrets
certs/
*.p12
*.pfx
*.key
.env
```

### **Create Environment Variables**
```env
# .env file (DO NOT commit)
WIN_CERT_PASSWORD=your_certificate_password
APPLE_ID=your-apple-id@email.com
APPLE_ID_PASSWORD=app-specific-password
APPLE_TEAM_ID=your-team-id
GPG_PASSPHRASE=your-gpg-passphrase
```

## 🔧 **Test Signing Process**

### **Test Windows Signing**
```powershell
# Test sign a simple file
$cert = Get-ChildItem -Path "Cert:\CurrentUser\My" | Where-Object {$_.Subject -like "*Your Business Name*"}
Set-AuthenticodeSignature -FilePath "test.exe" -Certificate $cert -TimeStampServer "http://timestamp.digicert.com"

# Verify signature
Get-AuthenticodeSignature -FilePath "test.exe"
```

### **Test macOS Signing** (on Mac)
```bash
# Test sign an app bundle
codesign --sign "Developer ID Application: Your Name" --timestamp MyApp.app

# Verify signature
codesign --verify --verbose MyApp.app
spctl --assess --verbose MyApp.app
```

### **Test Linux Signing**
```bash
# Test sign a file
gpg --detach-sign --armor test-file.txt

# Verify signature
gpg --verify test-file.txt.asc test-file.txt
```

## 📋 **Certificate Management Checklist**

### **Security Checklist**
- [ ] Certificates stored in secure location
- [ ] Certificate passwords are strong and unique
- [ ] Private keys are backed up securely
- [ ] Certificates are not committed to version control
- [ ] Access to certificates is limited
- [ ] Certificate expiration dates are tracked

### **Setup Checklist**
- [ ] Windows certificate ordered and received
- [ ] Apple Developer account approved
- [ ] GPG keys generated for Linux
- [ ] Certificates installed and tested
- [ ] Environment variables configured
- [ ] Build system updated with certificate paths
- [ ] Test signing successful on all platforms

## 💰 **Cost Summary**

| Certificate | Cost | Validity | Provider |
|-------------|------|----------|----------|
| Windows EV Code Signing | $474/year | 1 year | DigiCert |
| Apple Developer Account | $99/year | 1 year | Apple |
| Linux GPG Keys | Free | No expiration | Self-generated |
| **Total Annual** | **$573** | | |

## ⏰ **Timeline**

| Task | Duration | Can Start |
|------|----------|-----------|
| Windows Certificate Order | 1-3 business days | Today |
| Apple Developer Application | 24-48 hours | Today |
| Linux GPG Generation | 30 minutes | Today |
| Certificate Configuration | 2-4 hours | After receiving certificates |
| Testing & Validation | 1-2 hours | After configuration |

## 🚨 **Important Notes**

### **Windows Certificate Tips**
- **EV certificates** provide immediate SmartScreen reputation
- **Standard certificates** require building reputation over time
- Store certificate password securely (use environment variables)
- Test signing before production use

### **Apple Certificate Tips**
- Requires macOS computer for certificate management
- Need Xcode for certificate generation
- App-specific passwords required for automation
- Notarization requires separate setup

### **Linux GPG Tips**
- Use 4096-bit keys for better security
- Set reasonable expiration date (2-3 years)
- Publish public key to key servers
- Keep private key backup in secure location

## 🎯 **Next Steps After Certificates**

1. **Configure CI/CD** with certificates
2. **Test automated builds** with signing
3. **Set up app store accounts**
4. **Prepare for beta testing**
5. **Plan production launch**

---

## 🚀 **Ready to Start?**

**Priority 1**: Order Windows certificate from DigiCert today
**Priority 2**: Apply for Apple Developer account today  
**Priority 3**: Generate Linux GPG keys today

The certificate setup is the longest part of the production process, so starting today will put you on track for launch in 2-3 weeks!
