# Private Beta Testing Guide - v1.8.2-beta

## ⚠️ Important: Unsigned Beta Builds

**Beta builds may be unsigned and require OS security bypass steps.**
**Production builds will be signed and notarized where applicable.**

Do not hide the warning from testers. Make it explicit.

## What We're Testing

This beta focuses on cross-platform packaging and core activation flow.

### Platform Focus Order
1. **Linux** (ready now) - Primary validation platform
2. **macOS** (packaging ready, needs validation) - Secondary platform
3. **Windows** (packaging ready, needs validation) - Tertiary platform

### Critical User Journeys to Validate

| Journey | Steps | Expected Outcome |
|---------|-------|------------------|
| First Run | Install → Launch → Workspace → Build | Proof appears within 90 seconds |
| Safe Fix | Dangerous prompt → Refused → Explanation | No file changes, proof created |
| Proof Export | Run command → Proof generated → Export | Proof file downloads/copies |
| Persistence | Quit → Reopen → History | Previous proofs visible |
| Diagnostics | Menu → Help → Export bundle | Support bundle downloads |

## Beta Tester Instructions

### 1. Install the App

**Linux:**
```bash
chmod +x RinaWarp-Terminal-Pro-1.8.2-beta.AppImage
./RinaWarp-Terminal-Pro-1.8.2-beta.AppImage
```

**macOS:**
- Double-click DMG
- Drag to Applications
- ⚠️ **Right-click and Open** (first launch requires this security workaround)
- Gatekeeper will show a warning about unsigned app - click "Open"

**Windows:**
- Run the .exe installer
- ⚠️ **If SmartScreen blocks:** Click "More info" → "Run anyway"
- First launch will also show warnings - use same bypass

### 2. First-Run Activation Flow

1. Launch RinaWarp Terminal Pro
2. When prompted, select a project folder (e.g., a Node.js or React project)
3. Ask Rina: "What is this project?"
4. Click "Build this project" and tell me what fails
5. See stream/run output
6. See proof appear
7. **Success criterion:** Proof shows verification status within 90 seconds

### 3. Smoke Test Each Artifact

For each platform, complete:

- [ ] Install/open app (document any security warnings)
- [ ] Select workspace folder
- [ ] Run: "Build this project and tell me what fails"
- [ ] See stream/run output
- [ ] See proof generated
- [ ] Export proof
- [ ] Quit/reopen app
- [ ] Confirm history/proof persists

### 4. Report Feedback

**Issues:**
- GitHub: https://github.com/Bigsgotchu/rinawarp-terminal-pro/issues
- Tag: `beta`
- Include full reproduction steps

**Feedback:**
- Email: beta@rinawarptech.com
- Include:
  - OS and version
  - Artifact tested
  - Time to first proof
  - Any UI confusion points
  - Would you use/pay?

**Diagnostic Info:**
- Menu → Help → Export Diagnostic Bundle
- Attach to feedback email

**Uninstall:**
- macOS: Drag from Applications to Trash
- Windows: Control Panel → Programs → Uninstall
- Linux: Delete the AppImage and `~/.config/rinawarp-terminal-pro`

## Beta Results Tracking

Please record:

| Field | Value |
|-------|-------|
| OS | |
| Artifact tested | |
| Install success/fail | |
| First proof generated? | |
| Time to first proof (seconds) | |
| Safe fix approved? | |
| Proof exported? | |
| Restart persistence? | |
| Confusing UI moments | |
| Crashes/errors | |
| Would you use/pay? | |

## Production Blockers Remaining

Before full public production:

- [ ] Apple Developer signing certificate ($99/year)
- [ ] macOS notarization via Apple
- [ ] Windows code-signing certificate ($100+/year)
- [ ] Signed Windows installer
- [ ] Final Stripe/auth/license hardening
- [ ] Private beta feedback resolved
- [ ] Final production release notes

## Current Classification

**Linux:** Production candidate validated.
**macOS/Windows:** Unsigned beta builds ready for tester validation.
**Full production:** Pending signing/notarization and beta feedback.