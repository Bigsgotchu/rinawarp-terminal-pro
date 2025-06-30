# GitHub Actions Setup & Monitoring Guide

## 🔍 1. Monitor GitHub Actions

### Check Workflow Status
1. **Open GitHub Actions Tab**:
   ```
   https://github.com/Bigsgotchu/rinawarp-terminal/actions
   ```

2. **Current Workflows Available**:
   - ✅ **CI (Continuous Integration)** - Runs on push/PR
   - ✅ **Build and Release** - Manual trigger + tags
   - ✅ **Nightly Builds** - Scheduled (2 AM UTC)
   - ✅ **Release** - Triggered by version tags

3. **Expected First Run**: CI workflow should trigger automatically from the recent push

### Workflow Status Indicators
- 🟢 **Green checkmark** = Success
- 🔴 **Red X** = Failed
- 🟡 **Yellow circle** = In progress
- ⚪ **Gray circle** = Queued/Pending

---

## 🔐 2. Required Secrets Setup

Navigate to: `https://github.com/Bigsgotchu/rinawarp-terminal/settings/secrets/actions`

### Essential Secrets for Production

#### Windows Code Signing (Required for production)
```
WINDOWS_CERTIFICATE
- Description: Base64 encoded PFX certificate file
- Required for: Windows builds with trusted code signing
- How to get: Purchase from DigiCert, Sectigo, or GlobalSign

WINDOWS_CERTIFICATE_PASSWORD
- Description: Password for the PFX certificate
- Required for: Unlocking the certificate file
```

#### macOS Code Signing (Required for Mac builds)
```
MACOS_CERTIFICATE
- Description: Base64 encoded p12 certificate file
- Required for: macOS app signing and notarization

MACOS_CERTIFICATE_PASSWORD
- Description: Password for the p12 certificate

APPLE_ID
- Description: Apple ID email for notarization
- Required for: macOS Gatekeeper bypass

APPLE_ID_PASSWORD
- Description: App-specific password for Apple ID
- Required for: Automated notarization

APPLE_TEAM_ID
- Description: Apple Developer Team ID
- Required for: Code signing team identification
```

#### Optional Secrets (for enhanced features)
```
SLACK_WEBHOOK_URL
- Description: Slack webhook for build notifications
- Optional: For team notifications

DISCORD_WEBHOOK_URL
- Description: Discord webhook for build notifications
- Optional: For community notifications

NPM_TOKEN
- Description: NPM registry token
- Optional: If publishing to NPM registry
```

### Current Setup (Development)
Currently using **self-signed certificates** for development:
- ✅ Windows: Auto-generated self-signed certificate
- ✅ Linux: No signing required
- ⚠️ macOS: Unsigned (will show security warnings)

---

## 🛠️ 3. How to Add Secrets

### Step-by-Step Process
1. Go to repository Settings
2. Click "Secrets and variables" → "Actions"
3. Click "New repository secret"
4. Enter secret name and value
5. Click "Add secret"

### For Certificate Files
1. **Encode certificate to Base64**:
   ```powershell
   # Windows PowerShell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("path\to\certificate.pfx"))
   ```
   
   ```bash
   # Linux/macOS
   base64 -i certificate.p12 -o certificate.base64
   ```

2. **Copy the Base64 string** and paste as secret value

---

## 📊 4. Workflow Monitoring Commands

### Using GitHub CLI (after authentication)
```bash
# Authenticate first
gh auth login

# List workflows
gh workflow list

# View recent runs
gh run list

# View specific workflow runs
gh run list --workflow="ci.yml"

# Watch a running workflow
gh run watch

# View logs for a specific run
gh run view [RUN_ID] --log
```

### Manual Workflow Triggers
```bash
# Trigger build-and-release workflow manually
gh workflow run "build-and-release.yml"

# Trigger nightly build manually
gh workflow run "nightly.yml"

# Trigger with inputs
gh workflow run "build-and-release.yml" -f release_type=prerelease -f create_release=true
```

---

## ⚠️ 5. Common Issues & Solutions

### Issue: "Self-signed certificate" warnings
**Solution**: 
- For development: Expected behavior
- For production: Purchase proper code signing certificates

### Issue: macOS builds fail without certificates
**Solution**: 
- Add macOS signing secrets
- Or comment out macOS builds in workflows temporarily

### Issue: Workflow doesn't trigger
**Check**:
- Branch protection rules
- Workflow file syntax (YAML validation)
- Repository permissions

### Issue: Linux builds fail
**Common causes**:
- Missing system dependencies
- AppImage build issues
- Permission problems

---

## 🎯 6. Next Steps for Production

### Immediate (Development)
- [x] Monitor CI workflow completion
- [x] Check build artifacts are created
- [x] Verify Windows builds are signed (self-signed)

### Short-term (Pre-production)
- [ ] Purchase Windows code signing certificate
- [ ] Setup macOS Developer account and certificates
- [ ] Add production secrets to repository
- [ ] Test release workflow with proper certificates

### Long-term (Production)
- [ ] Setup Extended Validation (EV) certificate for instant trust
- [ ] Configure automated certificate renewal
- [ ] Setup monitoring and alerting for failed builds
- [ ] Implement automatic security scanning

---

## 📋 7. Workflow File Locations

```
.github/workflows/
├── ci.yml                 # Continuous Integration
├── build-and-release.yml  # Cross-platform builds
├── nightly.yml           # Nightly development builds
└── release.yml           # Production releases
```

### Workflow Triggers Summary

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| CI | Push to any branch, PRs | Quick validation |
| Build & Release | Manual, main/develop push | Full builds |
| Nightly | Schedule (2 AM UTC) | Development builds |
| Release | Git tags (v*.*.*) | Production releases |

---

## 🔗 Quick Links

- **Actions Dashboard**: https://github.com/Bigsgotchu/rinawarp-terminal/actions
- **Settings > Secrets**: https://github.com/Bigsgotchu/rinawarp-terminal/settings/secrets/actions
- **Releases Page**: https://github.com/Bigsgotchu/rinawarp-terminal/releases
- **Issues**: https://github.com/Bigsgotchu/rinawarp-terminal/issues

---

## 📞 Support

If workflows fail or you need help:
1. Check the workflow logs in GitHub Actions
2. Review this documentation
3. Check common issues section
4. Create an issue with workflow logs attached

**Remember**: Current setup works for development. For production distribution, you'll need proper code signing certificates!
