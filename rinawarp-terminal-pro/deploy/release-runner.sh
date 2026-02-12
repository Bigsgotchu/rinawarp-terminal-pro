#!/usr/bin/env bash
set -euo pipefail

trap 'echo "❌ Failed at line $LINENO"; exit 1' ERR

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VER="${VER:-$(node -e 'const fs=require("fs");const p=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(p.version);' "$ROOT_DIR/apps/terminal-pro/package.json")}"
DIST_DIR="${DIST_DIR:-apps/terminal-pro/dist}"
BUCKET="${BUCKET:-rinawarp-installers}"
SKIP_BUILD="${SKIP_BUILD:-0}"
AUTO_COMMIT="${AUTO_COMMIT:-0}"
DRY_RUN="${DRY_RUN:-0}"
REQUIRE_SIGNATURES="${REQUIRE_SIGNATURES:-1}"
SIGN_RELEASE="${SIGN_RELEASE:-1}"

if [[ "$SKIP_BUILD" == "1" ]]; then
  echo "== 0) Build desktop installers (skipped) =="
else
  echo "== 0) Build desktop installers =="
  npm --workspace apps/terminal-pro run build:all
fi

echo "== 1) Normalize artifact filenames =="
export VER DIST_DIR
./deploy/normalize-artifacts.sh

echo "== 2) Update release metadata =="
./deploy/update-hashes.sh

echo "== 2.02) Verify website download links and manifest =="
npm run verify:downloads

if [[ "$SIGN_RELEASE" == "1" ]]; then
  echo "== 2.05) Sign release checksums =="
  ./deploy/sign-release.sh
fi

if [[ "$REQUIRE_SIGNATURES" == "1" ]]; then
  echo "== 2.1) Verify signed release artifacts =="
  ./deploy/verify-release-signatures.sh
else
  echo "== 2.1) Verify signed release artifacts (skipped) =="
fi

if [[ "$AUTO_COMMIT" == "1" ]]; then
  git add \
    "release/v$VER/SHASUMS256.txt" \
    "rinawarptech-website/web/downloads/terminal-pro/SHA256SUMS.txt" \
    "rinawarptech-website/web/releases/v$VER.json" \
    "rinawarptech-website/releases/v$VER.json" || true
  if ! git diff --cached --quiet; then
    git commit -m "Release v$VER: update installer metadata"
    git push
  else
    echo "No metadata changes to commit."
  fi
else
  echo "ℹ️ AUTO_COMMIT=0, skipping git commit/push."
fi

echo "== 3) Preflight =="
./deploy/preflight-release.sh

echo "== 3.5) Local installer smoke checks =="
./deploy/installer-smoke.sh

echo "== 4) Upload to R2 (remote) =="
FILES=(
  "RinaWarp-Terminal-Pro-$VER.exe"
  "RinaWarp-Terminal-Pro-$VER.AppImage"
  "RinaWarp-Terminal-Pro-$VER.amd64.deb"
  "SHASUMS256.txt"
  "SHASUMS256.txt.asc"
  "RINAWARP_GPG_PUBLIC_KEY.asc"
)

for f in "${FILES[@]}"; do
  if [[ "$f" == "SHASUMS256.txt" || "$f" == "SHASUMS256.txt.asc" || "$f" == "RINAWARP_GPG_PUBLIC_KEY.asc" ]]; then
    test -f "release/v$VER/$f" || { echo "❌ Missing release/v$VER/$f"; exit 1; }
  else
    test -f "$DIST_DIR/$f" || { echo "❌ Missing $DIST_DIR/$f"; exit 1; }
  fi
done

for f in "${FILES[@]}"; do
  echo "⬆️ Uploading $f"
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "   (dry-run) skip upload"
  elif [[ "$f" == "SHASUMS256.txt" || "$f" == "SHASUMS256.txt.asc" || "$f" == "RINAWARP_GPG_PUBLIC_KEY.asc" ]]; then
    npx wrangler r2 object put "$BUCKET/$f" --file "release/v$VER/$f" --remote
  else
    npx wrangler r2 object put "$BUCKET/$f" --file "$DIST_DIR/$f" --remote
  fi
done

echo "== 5) Smoke test gated download =="
if [[ "$DRY_RUN" == "1" ]]; then
  echo "(dry-run) skip D1 seed and production smoke"
  echo "== Release runner complete ✅ (dry-run) =="
  exit 0
fi

if ! npx wrangler d1 execute rinawarp-prod --command \
"INSERT OR REPLACE INTO entitlements (customer_id, tier, status, customer_email, subscription_id, updated_at)
 VALUES ('cus_TEST', 'team', 'active', 'test@rinawarptech.com', NULL, strftime('%s','now')*1000);" >/dev/null 2>&1; then
  echo "⚠ Could not seed D1 test entitlement from current wrangler context."
  echo "   Continuing with non-auth and production route audits."
fi

TOKEN="$(curl -sS "https://rinawarp-downloads.rinawarptech.workers.dev/api/download-token?customer_id=cus_TEST" \
  | python3 -c "import sys,json; j=json.load(sys.stdin); print(j.get('token',''))" 2>/dev/null || true)"

if [[ -n "$TOKEN" ]]; then
  echo "TOKEN=${TOKEN:0:8}... (redacted)"
  curl -sSI "https://www.rinawarptech.com/downloads/RinaWarp-Terminal-Pro-$VER.AppImage?token=$TOKEN" \
    | egrep -i "HTTP/|content-type:|content-disposition:" || true
else
  echo "⚠ Could not mint token from public endpoint. Skipping authenticated download check."
fi

curl -sSI "https://www.rinawarptech.com/downloads/RinaWarp-Terminal-Pro-$VER.AppImage" \
  | egrep -i "HTTP/" || true

echo "== 6) Production audit =="
bash scripts/audit-site.sh \
  "https://www.rinawarptech.com" \
  "https://rinawarptech-website.pages.dev" \
  "https://rinawarp-downloads.rinawarptech.workers.dev/verify/SHASUMS256.txt"

echo "== Release runner complete ✅ =="
