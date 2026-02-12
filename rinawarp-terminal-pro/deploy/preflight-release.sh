#!/usr/bin/env bash
set -euo pipefail

trap 'echo "❌ Failed at line $LINENO"; exit 1' ERR

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VER="${VER:-$(node -e 'const fs=require("fs");const p=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(p.version);' "$ROOT_DIR/apps/terminal-pro/package.json")}"
DIST_DIR="${DIST_DIR:-apps/terminal-pro/dist}"
BUCKET="${BUCKET:-rinawarp-installers}"

echo "== Repo root check =="
test -f package.json || echo "ℹ️  No root package.json (monorepo is fine)"
if git rev-parse --show-toplevel >/dev/null 2>&1; then
  echo "✅ Git repository detected"
else
  echo "ℹ️  Git metadata not available in this working directory"
fi

echo "== Artifact presence check (Current release targets) =="
echo "📝 Release targets: Windows EXE + Linux AppImage + Linux DEB"

REQUIRED_FILES=(
  "RinaWarp-Terminal-Pro-$VER.exe"
  "RinaWarp-Terminal-Pro-$VER.AppImage"
  "RinaWarp-Terminal-Pro-$VER.amd64.deb"
)

OPTIONAL_FILES=(
  "RinaWarp-Terminal-Pro-$VER.dmg"
)

echo "--- macOS: Not in current release pipeline ---"
echo "   macOS signed/notarized DMG requires Apple Developer Program"

echo ""
echo "=== Checking REQUIRED files ==="
for f in "${REQUIRED_FILES[@]}"; do
  if [ -f "$DIST_DIR/$f" ]; then
    echo "✅ Found: $f"
  else
    echo "❌ Missing required: $DIST_DIR/$f"
    exit 1
  fi
done

echo ""
echo "=== Checking OPTIONAL files ==="
all_opt_found=true
for f in "${OPTIONAL_FILES[@]}"; do
  if [ -f "$DIST_DIR/$f" ]; then
    echo "✅ Found (optional): $f"
  else
    echo "⚪ Missing (optional): $f"
    all_opt_found=false
  fi
done

if [ "$all_opt_found" = false ]; then
  echo ""
  echo "ℹ️  Some optional files are missing. This is fine for Phase 1."
fi

echo ""
echo "Required Linux artifacts found ✅"
ls -lah "$DIST_DIR" | sed -n '1,140p'

echo "== Wrangler auth check =="
npx wrangler whoami

echo "== Website quick health =="
for p in / /pricing /download /terms/ /privacy/ /refunds/ /eula/ /login/; do
  code="$(curl -s -o /dev/null -w "%{http_code}" "https://www.rinawarptech.com$p")"
  echo "$p -> $code"
done

echo ""
echo "== Done ✅ Preflight passed =="
echo ""
echo "📋 Optional next step:"
echo "   Configure macOS signing in deploy/macos-sign-notarize.sh"
