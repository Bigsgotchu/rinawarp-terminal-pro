# RinaWarp Terminal Pro v1.8.2 Beta Tester Guide

RinaWarp Terminal Pro v1.8.2-beta is currently positioned for controlled Linux public beta revenue testing. The public beta promise is Linux early access with live checkout, live downloads, proof recovery, and founder-led support.

Do not position this beta as a fully polished cross-platform terminal replacement, an enterprise-grade Warp.dev competitor, or zero-touch mature production onboarding.

## Important: Controlled Linux Beta

Linux is the current supported public beta platform. macOS and Windows signing, notarization, and validation remain outside this controlled beta promise.

## What We're Testing

This beta focuses on Linux packaging, checkout routing, core activation, proof recovery, and founder-led support.

### Platform Focus Order
1. **Linux** (ready now) - Primary and only public beta validation platform
2. **macOS** - Not in the current public beta promise
3. **Windows** - Not in the current public beta promise

### Artifact Names

- Linux AppImage: `RinaWarp-Terminal-Pro-1.8.2-beta-linux-x86_64.AppImage`
- Linux Debian package: `RinaWarp-Terminal-Pro-1.8.2-beta-linux-amd64.deb`

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
chmod +x RinaWarp-Terminal-Pro-1.8.2-beta-linux-x86_64.AppImage
./RinaWarp-Terminal-Pro-1.8.2-beta-linux-x86_64.AppImage
```

**macOS:**
- Not part of the current controlled public beta.

**Windows:**
- Not part of the current controlled public beta.

### 2. First-Run Activation Flow

1. Launch RinaWarp Terminal Pro
2. When prompted, select a project folder (e.g., a Node.js or React project)
3. Ask Rina: "What is this project?"
4. Ask Rina: "Build this project and tell me what fails"
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

RinaWarp Terminal Pro v1.8.2 beta now has Linux, macOS, and Windows beta artifacts. Linux is production-candidate validated; macOS and Windows are unsigned beta builds for tester validation. Production signing/notarization remains pending.
