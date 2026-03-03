#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VER="${VER:-$(node -e 'const fs=require("fs");const p=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(p.version);' "$ROOT/apps/terminal-pro/package.json")}"
DIST_DIR="${DIST_DIR:-$ROOT/apps/terminal-pro/dist}"
API_BASE="${API_BASE:-https://api.rinawarptech.com}"
TEST_CUSTOMER_ID="${TEST_CUSTOMER_ID:-cus_TEST}"

APPIMAGE="$DIST_DIR/RinaWarp-Terminal-Pro-$VER.AppImage"
DEB="$DIST_DIR/RinaWarp-Terminal-Pro-$VER.amd64.deb"
EXE="$DIST_DIR/RinaWarp-Terminal-Pro-$VER.exe"

echo "== App Deep Scan =="
echo "Version : $VER"
echo "API     : $API_BASE"
echo

echo "== 1) Build Electron app =="
npm --workspace apps/terminal-pro run build:electron
echo

if [[ ! -f "$APPIMAGE" || ! -f "$DEB" || ! -f "$EXE" ]]; then
  echo "== 2) Build installers (artifacts missing) =="
  npm --workspace apps/terminal-pro run build:all
else
  echo "== 2) Build installers (skipped, artifacts present) =="
fi
echo

echo "== 3) Installer artifact smoke =="
bash deploy/installer-smoke.sh
echo

echo "== 4) License API behavior =="
bad_code="$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_BASE/api/license/verify" -H "content-type: application/json" --data '{}' || echo "000")"
echo "Missing customer_id -> $bad_code (expected 400)"
if [[ "$bad_code" != "400" ]]; then
  echo "❌ Unexpected status for invalid license verify request"
  exit 1
fi

good_json="$(curl -fsS -X POST "$API_BASE/api/license/verify" -H "content-type: application/json" --data "{\"customer_id\":\"$TEST_CUSTOMER_ID\",\"device_id\":\"app-scan\",\"app_version\":\"$VER\"}" || true)"
if ! printf "%s" "$good_json" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{const j=JSON.parse(d);if(j.ok&&j.license_token)process.exit(0)}catch{}process.exit(1)})'; then
  echo "❌ Failed valid license verify flow for $TEST_CUSTOMER_ID"
  echo "Response: ${good_json:-<empty>}"
  exit 1
fi
echo "✅ Valid license verify returned token"
echo

echo "== 5) Release signature + checksum verification =="
bash deploy/update-hashes.sh
bash deploy/sign-release.sh
bash deploy/verify-release-signatures.sh
echo

echo "✅ PASS: app deep scan complete"
