# Beta Release Blocker Status

## Current State

### ✅ Completed Work

**Packaging Infrastructure**
- electron-builder.yml configured for all platforms
- macOS: DMG + ZIP targets
- Windows: NSIS installer target
- Linux: AppImage + deb (verified working)

**Workflow Updates**
- package-mac job added (runs on macos-latest)
- package-windows job handles unsigned builds gracefully
- All artifact download/upload paths configured

**Telemetry Events**
- Added: first_proof_generated, proof_exported, app_installed, etc.

**Support Infrastructure**
- supportBundle.ts exists for diagnostics
- smoke/release.sh updated for cross-platform

**Documentation**
- SIGNING.md with environment variables
- BETA_TESTER_GUIDE.md for testers
- BETA_RELEASE_CHECKLIST.md

### ⏳ Unblocked Work (Ready for Testing)

The workflow will now build unsigned packages when certificates aren't available. This allows validation on GitHub runners.

**Workflow Behavior:**
- If CSC_LINK is set → Signed build
- If CSC_LINK is empty → Unsigned build (with warnings)

**Unsigned Build Warnings:**
- macOS: Gatekeeper will require explicit approval
- Windows: SmartScreen will show warnings
- This is acceptable for beta testing

### 🚫 Blocked - Need Certificates

| Blocker | Required For | Cost Estimate |
|---------|-------------|--------------|
| Apple Developer ID | macOS signing + notarization | $99/year |
| Windows Code Signing | Windows Authenticode signing | $100-300/year |

### 📋 Next Actions

1. **Run Beta Build**
   ```bash
   gh workflow run release-desktop.yml
   ```

2. **Download Unsigned Artifacts**
   - Test on personal macOS/Windows machine
   - Document Gatekeeper/SmartScreen bypass steps

3. **Manual Validation**
   - Launch app, select workspace
   - Run "Build this project"
   - Verify proof appears

4. **Private Beta (10-25 developers)**
   - Distribute unsigned builds with bypass instructions
   - Collect feedback on:
     - Gatekeeper bypass flow
     - SmartScreen behavior
     - First proof generation time

5. **Purchase Certificates When Ready**
   - Apple Developer: https://developer.apple.com ($99/year)
   - Windows: DigiCert, Sectigo, or similar CA ($100+/year)

### 🔧 Bypass Instructions for Beta Testers

**macOS:**
1. Right-click the app
2. Select "Open"
3. Click "Open" in the dialog
4. Gatekeeper will remember this approval

**Windows:**
1. Run the installer
2. If blocked, click "More info"
3. Click "Run anyway"
4. SmartScreen may warn on first run

### 📊 Activation Tracking

The key metric: `first_proof_generated`
- Time from install to first proof
- Target: < 90 seconds
- If users can't reach proof, they think it's "just a chatbot"