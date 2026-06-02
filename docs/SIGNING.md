# Code Signing & Notarization Guide

This document describes the code signing and notarization requirements for RinaWarp Terminal Pro desktop releases.

## Overview

- **macOS**: Requires Developer ID certificate for signing and Apple ID for notarization
- **Windows**: Requires Authenticode certificate for signing
- **Linux**: No code signing required (AppImage/deb)

## Environment Variables

### macOS Signing & Notarization

| Variable | Description | Required |
|----------|-------------|----------|
| `APPLE_ID` / `RINAWARP_APPLE_ID` | Apple ID email for notarization | Yes (for notarization) |
| `APPLE_ID_PASSWORD` / `RINAWARP_APPLE_ID_PASSWORD` | App-specific password for Apple ID | Yes (for notarization) |
| `APPLE_TEAM_ID` / `RINAWARP_APPLE_TEAM_ID` | 10-character Apple Developer Team ID | Yes (for notarization) |
| `CSC_LINK` / `RINAWARP_CSC_LINK` | Path to P12 certificate or base64-encoded certificate | Yes (for signing) |
| `CSC_KEY_PASSWORD` / `RINAWARP_CSC_KEY_PASSWORD` | Password for the certificate | Yes (for signing) |

### Windows Signing

| Variable | Description | Required |
|----------|-------------|----------|
| `CSC_LINK` / `RINAWARP_CSC_LINK` | Path to PFX certificate or base64-encoded certificate | Yes (for signing) |
| `CSC_KEY_PASSWORD` / `RINAWARP_CSC_KEY_PASSWORD` | Password for the certificate | Yes (for signing) |

## Setup Instructions

### macOS

1. **Generate App-Specific Password**:
   - Go to Apple ID settings
   - Generate an app-specific password for "Notarization"
   - Use this instead of your account password

2. **Get Team ID**:
   - Log into [Apple Developer Portal](https://developer.apple.com/account/)
   - Your Team ID is displayed in the membership details

3. **Prepare Certificate**:
   ```bash
   # Export Developer ID Application certificate from Keychain Access
   # Save as .p12 file
   
   # Or use base64 encoding
   base64 -i DeveloperID.p12 -o cert-base64.txt
   export CSC_LINK="$(cat cert-base64.txt)"
   ```

### Windows

1. **Obtain Code Signing Certificate**:
   - Purchase from DigiCert, Sectigo, or similar CA
   - Export as .PFX file

2. **Prepare Certificate**:
   ```bash
   # Base64 encode the PFX file
   base64 -i cert.pfx -o cert-base64.txt
   export CSC_LINK="$(cat cert-base64.txt)"
   export CSC_KEY_PASSWORD="your-password"
   ```

## CI/CD Configuration

Add these secrets to your GitHub repository:

- `RINAWARP_APPLE_ID`
- `RINAWARP_APPLE_ID_PASSWORD`
- `RINAWARP_APPLE_TEAM_ID`
- `RINAWARP_CSC_LINK`
- `RINAWARP_CSC_KEY_PASSWORD`

## Verification

Run the signing verification script:

```bash
npm --workspace apps/terminal-pro run verify:signing
```

## Build Commands

```bash
# Build and package all platforms (requires signing credentials)
npm run build:all

# Build and package macOS only
npm --workspace apps/terminal-pro run dist:mac

# Build and package Windows only
npm --workspace apps/terminal-pro run dist:win

# Build and package Linux only
npm --workspace apps/terminal-pro run dist:linux
```

## Troubleshooting

### macOS Notarization Fails

1. Check Apple ID credentials
2. Ensure app-specific password is used (not account password)
3. Verify Team ID is correct
4. Check that the app bundle is not too large

### Windows Signing Fails

1. Verify certificate is valid and not expired
2. Check password is correct
3. Ensure certificate has code signing purpose

### Unsigned Builds

If signing credentials are not provided, the build will produce unsigned artifacts. This is acceptable for beta/internal releases but not for public distribution.