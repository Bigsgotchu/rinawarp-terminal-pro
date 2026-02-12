#!/usr/bin/env bash
set -euo pipefail

APP_PATH="${1:?Usage: macos-sign-notarize.sh <path-to-app>}"
APPLE_ID="${APPLE_ID:?export APPLE_ID=you@example.com}"
TEAM_ID="${TEAM_ID:?export TEAM_ID=ABCDE12345}"
APP_PASSWORD="${APP_PASSWORD:?export APP_PASSWORD=xxxx-xxxx-xxxx-xxxx}"  # app-specific password
SIGN_ID="${SIGN_ID:?export SIGN_ID='Developer ID Application: Your Name (TEAMID)'}"

echo "== Signing app: $APP_PATH =="
/usr/bin/codesign --force --options runtime --timestamp --deep --sign "$SIGN_ID" "$APP_PATH"
/usr/bin/codesign --verify --deep --strict --verbose=2 "$APP_PATH"

echo "== Zip for notarization =="
ZIP_PATH="$(mktemp -t rinawarp-notarize.XXXXXX).zip"
/usr/bin/ditto -c -k --keepParent "$APP_PATH" "$ZIP_PATH"

echo "== Submit for notarization =="
xcrun notarytool submit "$ZIP_PATH" \
  --apple-id "$APPLE_ID" \
  --team-id "$TEAM_ID" \
  --password "$APP_PASSWORD" \
  --wait

echo "== Staple notarization ticket =="
xcrun stapler staple "$APP_PATH"

echo "== Done ✅ =="
