#!/bin/bash
# verify-release.sh - Verify RinaWarp Terminal Pro release signatures and checksums
# Usage: ./verify-release.sh

set -e

R2_BUCKET="rinawarp-installers"
R2_ENDPOINT="https://ba2f14cefa19dbdc42ff88d772410689.r2.cloudflarestorage.com"
WORK_DIR="/tmp/rinawarp-verify-$(date +%s)"

echo "=== RinaWarp Terminal Pro Release Verification ==="
echo ""

mkdir -p "$WORK_DIR"
cd "$WORK_DIR"

echo "[1/5] Downloading release files from R2..."
aws s3 cp "s3://${R2_BUCKET}/SHASUMS256.txt" . --endpoint-url "$R2_ENDPOINT"
aws s3 cp "s3://${R2_BUCKET}/SHASUMS256.txt.asc" . --endpoint-url "$R2_ENDPOINT"
aws s3 cp "s3://${R2_BUCKET}/RINAWARP_GPG_PUBLIC_KEY.asc" . --endpoint-url "$R2_ENDPOINT"
aws s3 cp "s3://${R2_BUCKET}/RinaWarp-Terminal-Pro-1.0.0.AppImage" . --endpoint-url "$R2_ENDPOINT"
aws s3 cp "s3://${R2_BUCKET}/RinaWarp-Terminal-Pro-1.0.0.amd64.deb" . --endpoint-url "$R2_ENDPOINT"
aws s3 cp "s3://${R2_BUCKET}/RinaWarp-Terminal-Pro-1.0.0.exe" . --endpoint-url "$R2_ENDPOINT"

echo "[2/5] Importing GPG public key..."
gpg --import RINAWARP_GPG_PUBLIC_KEY.asc

echo "[3/5] Verifying SHA256 checksums..."
sha256sum -c SHASUMS256.txt && echo "✓ SHA256 checksums match" || echo "✗ SHA256 checksums MISMATCH"

echo "[4/5] Verifying GPG signature..."
gpg --verify SHASUMS256.txt.asc SHASUMS256.txt 2>&1 | grep -q "Good signature" && echo "✓ GPG signature valid" || echo "✗ GPG signature INVALID"

echo "[5/5] Verifying signed checksums match actual files..."
SIGNED_CHECKSUMS=$(sha256sum RinaWarp-Terminal-Pro-*.AppImage RinaWarp-Terminal-Pro-*.amd64.deb RinaWarp-Terminal-Pro-*.exe | tee /tmp/signed_files.txt)
ACTUAL_CHECKSUMS=$(sha256sum -c SHASUMS256.txt 2>&1)

if echo "$SIGNED_CHECKSUMS" | grep -q "$(cat SHASUMS256.txt | head -1 | cut -d' ' -f1)"; then
    echo "✓ Signed checksums match actual file checksums"
else
    echo "✗ Checksum mismatch between signed file and actual files"
fi

echo ""
echo "=== Verification Complete ==="
echo "Files verified in: $WORK_DIR"

# Cleanup unless KEEP_VERIFY_TMP=1
if [[ "${KEEP_VERIFY_TMP:-0}" == "1" ]]; then
  echo "Keeping temporary files at: $WORK_DIR"
else
  rm -rf "$WORK_DIR"
  echo "Cleanup complete"
fi
