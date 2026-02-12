#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# RinaWarp Terminal Pro - Code Signing Verification Script
# Verifies macOS and Windows binaries are properly signed
# ============================================================

INSTALLER_DIR="${1:-./dist}"
PLATFORM="${2:-auto}"

echo "=============================================="
echo "RinaWarp Terminal Pro - Code Signing Check"
echo "=============================================="
echo "Installer Directory: $INSTALLER_DIR"
echo ""

# Detect platform if auto
if [[ "$PLATFORM" == "auto" ]]; then
  case "$(uname -s)" in
    Darwin*)  PLATFORM="macos" ;;
    Linux*)   PLATFORM="linux" ;;
    MINGW*|MSYS*|CYGWIN*) PLATFORM="windows" ;;
    *)        PLATFORM="unknown" ;;
  esac
fi

echo "Detected Platform: $PLATFORM"
echo ""

# macOS Verification
verify_macos() {
  echo "== macOS Code Signing Verification =="
  echo ""

  # Find .app bundle
  app_bundle=$(find "$INSTALLER_DIR" -name "*.app" -type d 2>/dev/null | head -1)
  dmg_file=$(find "$INSTALLER_DIR" -name "*.dmg" -type f 2>/dev/null | head -1)

  if [[ -n "$app_bundle" ]]; then
    echo "App Bundle: $app_bundle"
    echo ""

    # Verify code signature
    echo "Running: codesign -dv --verbose=4"
    if codesign -dv --verbose=4 "$app_bundle" 2>&1; then
      echo "✓ Code signature valid"
    else
      echo "✗ Code signature verification failed"
    fi
    echo ""

    # Verify notarization (spctl assessment)
    echo "Running: spctl --assess --type execute"
    if spctl --assess --type execute --verbose "$app_bundle" 2>&1; then
      echo "✓ Notarization assessment passed"
    else
      echo "✗ Notarization assessment failed - app will show scary warnings"
    fi
  else
    echo "⚠ No .app bundle found in $INSTALLER_DIR"
  fi

  echo ""

  if [[ -n "$dmg_file" ]]; then
    echo "DMG: $dmg_file"
    echo "Running: spctl --assess --type open (DMG assessment)"
    if spctl --assess --type open --verbose "$dmg_file" 2>&1; then
      echo "✓ DMG assessment passed"
    else
      echo "✗ DMG assessment failed"
    fi
  else
    echo "⚠ No .dmg file found in $INSTALLER_DIR"
  fi
}

# Windows Verification
verify_windows() {
  echo "== Windows Code Signing Verification =="
  echo ""

  exe_file=$(find "$INSTALLER_DIR" -name "*.exe" -type f 2>/dev/null | head -1)

  if [[ -n "$exe_file" ]]; then
    echo "EXE: $exe_file"
    echo ""

    # Verify with signtool
    if command -v signtool &>/dev/null; then
      echo "Running: signtool verify /pa"
      if signtool verify /pa "$exe_file" 2>&1; then
        echo "✓ Windows signature valid"
      else
        echo "✗ Windows signature verification failed"
      fi
    else
      echo "⚠ signtool not found (install Windows SDK)"
      echo "Manual verification:"
      echo "  Right-click the .exe → Properties → Digital Signatures"
      echo "  Verify signature is valid and from trusted publisher"
    fi

    echo ""

    # PowerShell verification
    if command -v pwsh &>/dev/null || command -v powershell &>/dev/null; then
      echo "Running: Get-AuthenticodeSignature"
      sig=$(Get-AuthenticodeSignature "$exe_file" 2>/dev/null || true)
      echo "$sig" | Format-List 2>/dev/null || echo "$sig"
    fi
  else
    echo "⚠ No .exe file found in $INSTALLER_DIR"
  fi
}

# Linux Verification
verify_linux() {
  echo "== Linux Code Signing Verification =="
  echo ""

  appimage=$(find "$INSTALLER_DIR" -name "*.AppImage" -type f 2>/dev/null | head -1)
  deb_file=$(find "$INSTALLER_DIR" -name "*.deb" -type f 2>/dev/null | head -1)
  rpm_file=$(find "$INSTALLER_DIR" -name "*.rpm" -type f 2>/dev/null | head -1)

  if [[ -n "$appimage" ]]; then
    echo "AppImage: $appimage"
    echo "Running: file command"
    file_output=$(file "$appimage" 2>/dev/null)
    echo "$file_output"

    if [[ "$file_output" == *"ELF"* ]]; then
      echo "✓ AppImage is valid ELF executable"
    else
      echo "✗ AppImage may not be a valid executable"
    fi

    echo ""
    echo "For full AppImage signing, consider:"
    echo "  - Sign with: gpg --armor --detach-sign appimage"
    echo "  - Verify with: gpg --verify appimage.asc appimage"
  else
    echo "⚠ No .AppImage file found in $INSTALLER_DIR"
  fi

  if [[ -n "$deb_file" ]]; then
    echo ""
    echo "DEB: $deb_file"
    echo "Running: dpkg-deb -I (info)"
    dpkg-deb -I "$deb_file" 2>&1 | head -20 || true
  fi

  if [[ -n "$rpm_file" ]]; then
    echo ""
    echo "RPM: $rpm_file"
    echo "Running: rpm -qip (info)"
    rpm -qip "$rpm_file" 2>&1 | head -20 || true
  fi
}

# Run platform-specific verification
case "$PLATFORM" in
  macos)  verify_macos ;;
  windows) verify_windows ;;
  linux)  verify_linux ;;
  *)
    echo "Unknown platform: $PLATFORM"
    echo "Running all verifications..."
    verify_macos
    verify_windows
    verify_linux
    ;;
esac

echo ""
echo "=============================================="
echo "Code Signing Verification Complete"
echo "=============================================="
echo ""
echo "Summary of required checks:"
echo "  macOS:  codesign + spctl assess"
echo "  Windows: signtool verify /pa"
echo "  Linux:   file + gpg signature"
echo ""
echo "⚠ If any check fails, users will see scary security warnings!"
echo "=============================================="
