# RinaWarp Terminal Pro - Launch Readiness Checklist

This document provides a comprehensive pre-launch checklist for the RinaWarp Terminal Pro product.

---

## Current Status (Last Updated: 2026-02-03)

### ✅ Working
- **Marketing Pages**: All legal pages deployed
  - /terms/, /privacy/, /refunds/, /eula/ working
- **Stripe Webhook Worker**: Code ready in `stripe-webhook-worker/`
  - Signature verification ✓
  - D1 idempotency ✓
  - Tier detection (pro/team) ✓
  - Entitlement writes ✓
  - License key generation ✓
- **Stripe Products**:
  - Pro Monthly: $29.99/mo (`price_1SOjFPGZrRdZy3W9IIm6ueBj`)
  - Pro Founder Lifetime: $699 (`price_1SOjEcGZrRdZy3W9PAbnoQ1p`)
  - Team Monthly: $49.99/mo (`price_1SOjFXGZrRdZy3W9bNz4HpfN`)
  - Team Pioneer Lifetime: $800 (`price_1SOjEdGZrRdZy3W9ll2FuOTW`)

### ❌ Needs Attention
- **Downloads**: AppImage, DEB, RPM, ZIP files missing in R2
- **Code Signing**: Verify all platforms are signed
- **Download Access**: Wire entitlement check to downloads

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Automated Release Scripts](#automated-release-scripts)
3. [Cross-Platform Release Commands](#cross-platform-release-commands)
4. [Downloads Verification](#downloads-verification)
5. [Stripe Integration](#stripe-integration)
6. [Code Signing](#code-signing)
7. [Production Checklist](#production-checklist)
8. [Pre-Flight Verification](#pre-flight-verification)
9. [RELEASE_CHECKLIST.md (Human-Readable)](RELEASE_CHECKLIST.md)

**Related:**
- [deploy/RELEASE_CHECKLIST.md](deploy/RELEASE_CHECKLIST.md) - Human-only release checklist

---

## Missing Items (Action Required)

### Downloads to Upload to R2

Upload these files to the `rinawarp-installers` R2 bucket:

| File | Status | Action |
|------|--------|--------|
| `RinaWarp-Terminal-Pro-1.0.0.AppImage` | ❌ Missing | Build and upload |
| `RinaWarp-Terminal-Pro-1.0.0.amd64.deb` | ❌ Missing | Build and upload |
| `RinaWarp-Terminal-Pro-1.0.0.x86_64.rpm` | ❌ Missing | Build and upload |
| `RinaWarp-Terminal-Pro-1.0.0-macOS.zip` | ❌ Missing | Build and upload |
| `RinaWarp-Terminal-Pro-1.0.0-win32.zip` | ❌ Missing | Build and upload |

### Build Command

```bash
# Build all installers
cd terminal-pro
npm run build:all

# Or individually:
npm run build:macos   # .dmg, .zip
npm run build:windows # .exe, .zip
npm run build:linux   # .AppImage, .deb, .rpm
```

### R2 Upload Command

```bash
# Upload to R2
cd /home/karina/Documents/rinawarp-terminal-pro
export VER="1.0.0"
export BUCKET="rinawarp-installers"
export DIST_DIR="apps/terminal-pro/dist"

FILES=(
  "RinaWarp-Terminal-Pro-$VER.dmg"
  "RinaWarp-Terminal-Pro-$VER.exe"
  "RinaWarp-Terminal-Pro-$VER.AppImage"
  "RinaWarp-Terminal-Pro-$VER.amd64.deb"
  # Optional:
  # "RinaWarp-Terminal-Pro-$VER.x86_64.rpm"
)

# fail-fast
for f in "${FILES[@]}"; do
  test -f "$DIST_DIR/$f" || { echo "❌ Missing $DIST_DIR/$f"; exit 1; }
done

# upload (correct wrangler syntax)
for f in "${FILES[@]}"; do
  echo "⬆️ Uploading $f"
  npx wrangler r2 object put "$BUCKET/$f" --file "$DIST_DIR/$f"
done
```

### Deploy Downloads Worker

Create `downloads-worker/wrangler.toml`:

```toml
name = "rinawarp-downloads"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[r2_buckets]]
binding = "INSTALLERS"
bucket_name = "rinawarp-installers"

[vars]
DOWNLOAD_BASE_URL = "https://rinawarptech.com/downloads"
```

Deploy:

```bash
cd downloads-worker
wrangler deploy
```

---

## Automated Release Scripts

Two scripts automate the release workflow:

### 1) Preflight Check (sanity before release)

```bash
export VER="1.0.0"
./deploy/preflight-release.sh
```

This checks:
- ✅ Repo root
- ✅ Required artifacts exist with canonical names
- ✅ Wrangler authentication
- ✅ Website pages respond (200)

### 2) Full Release Runner (end-to-end)

```bash
export VER="1.0.0"
./deploy/release-runner.sh
```

This runs:
1. Preflight check
2. Hash generation + commit + push
3. Upload to R2 (fail-fast)
4. Smoke test (entitlement → token → download)

---

## Quick Start

> Run from repo root

```bash
# Make scripts executable (first time only)
chmod +x deploy/*.sh

# REQUIRED: set release version
export VER="1.0.0"

# Option 1 — Comprehensive Upload & Verify (recommended during iteration)
./deploy/upload-and-verify.sh

# Option 2 — Automated Release Runner (preflight → hashes → upload → smoke)
./deploy/release-runner.sh

# Option 3 — Manual Step-by-Step (only if debugging)
# 1. Build installers (per OS)
npm run build:prod   # or npm run dist:<platform>

# 2. Run preflight checks
./deploy/preflight-release.sh

# 3. Update hashes
./deploy/update-hashes.sh

# 4. Upload to R2
# (see Cross-Platform Release Commands section)

# 5. Smoke test downloads + license
# (see Smoke Test section)
```

---

## Downloads Verification

### Automated Check (Recommended)

```bash
# Run comprehensive upload + verify (includes fail-fast file checks)
./deploy/upload-and-verify.sh
```

### Standalone Download Verification

```bash
# With token (full verification)
./deploy/check-downloads.sh https://rinawarptech.com/downloads <TOKEN>

# With token + no-token failure check
./deploy/check-downloads.sh https://rinawarptech.com/downloads <TOKEN> --verify-no-token-fails
```

### Manual Verification

Check that each installer file:

| File | Expected Size | Expected Content-Type |
|------|--------------|----------------------|
| `RinaWarp-Terminal-Pro-1.0.0.dmg` | ≥ 100MB | `application/x-apple-diskimage` |
| `RinaWarp-Terminal-Pro-1.0.0.exe` | ≥ 100MB | `application/octet-stream` |
| `RinaWarp-Terminal-Pro-1.0.0.AppImage` | ≥ 100MB | `application/octet-stream` |
| `RinaWarp-Terminal-Pro-1.0.0.amd64.deb` | ≥ 100MB | `application/vnd.debian.binary-package` |
| `RinaWarp-Terminal-Pro-1.0.0.x86_64.rpm` | ≥ 100MB | `application/x-rpm` |
| `RinaWarp-Terminal-Pro-1.0.0-macOS.zip` | ≥ 100MB | `application/zip` |
| `RinaWarp-Terminal-Pro-1.0.0-win32.zip` | ≥ 100MB | `application/zip` |

### Must-Pass Criteria

- ✅ HTTP 200/302/301 response
- ✅ Content-Type is NOT `text/html` (prevents routing issues)
- ✅ Content-Disposition includes `attachment`
- ✅ Content-Length ≥ 1MB (installers shouldn't be tiny)

### R2 Bucket Check (Optional)

```bash
# Using the comprehensive upload script (recommended - includes fail-fast)
./deploy/upload-and-verify.sh

# Or manually list R2 objects
wrangler r2 object list rinawarp-installers | head -n 50
```

Verify no obviously wrong file sizes (e.g., 20KB "installer").

---

## Stripe Integration

### Current Status: Dedicated Worker with D1 Created

The Stripe webhook endpoint (`https://api.rinawarptech.com/api/stripe/webhook`) currently returns 404.
A dedicated Worker has been created at `stripe-webhook-worker/` with full Stripe integration.

### Features
- ✅ Stripe signature verification
- ✅ D1 idempotency (prevents duplicate event processing)
- ✅ Tier detection (pro vs team based on price ID)
- ✅ Entitlement writes on `checkout.session.completed`
- ✅ License key generation for one-time purchases

### Price IDs (from Stripe Dashboard)

| Tier | Product | Price ID | Amount |
|------|---------|----------|--------|
| Pro | RinaWarp Pro (monthly) | `price_1SOjFPGZrRdZy3W9IIm6ueBj` | $29.99/mo |
| Pro | RinaWarp Founder (lifetime) | `price_1SOjEcGZrRdZy3W9PAbnoQ1p` | $699 one-time |
| Team | RinaWarp Team (monthly) | `price_1SOjFXGZrRdZy3W9bNz4HpfN` | $49.99/mo |
| Team | RinaWarp Pioneer (lifetime) | `price_1SOjEdGZrRdZy3W9ll2FuOTW` | $800 one-time |

### Deploy Stripe Webhook Worker

```bash
cd stripe-webhook-worker
npm install

# Set secrets (run once)
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npx wrangler secret put STRIPE_SECRET_KEY

# Create D1 database (run once)
npx wrangler d1 create rinawarp-prod
# Copy DB ID printed, then paste into wrangler.toml

# Apply database schema
npx wrangler d1 execute rinawarp-prod --file=./schema.sql

# Deploy Worker
npx wrangler deploy
```

### Route Worker to api.rinawarptech.com

**Dashboard (Recommended):**
1. Cloudflare Dashboard → Workers & Pages → rinawarp-stripe-webhook → Triggers → Routes
2. Add routes:
   - `api.rinawarptech.com/api/stripe/webhook`
   - `api.rinawarptech.com/api/download-token*`
3. Click "Add"

### Verify Webhook Endpoint

```bash
# GET should return 405 (correct - POST only)
curl -sSI https://api.rinawarptech.com/api/stripe/webhook

# Fake signature should return 400 (signature verification working!)
curl -i -X POST https://api.rinawarptech.com/api/stripe/webhook \
  -H "stripe-signature: test" \
  -d '{"type":"test"}'

# Use Stripe CLI for real test
stripe listen --forward-to https://api.rinawarptech.com/api/stripe/webhook
stripe trigger checkout.session.completed
```

### Database Schema

```sql
-- stripe_events: Idempotency (prevents duplicate processing)
CREATE TABLE stripe_events (
  event_id TEXT PRIMARY KEY,
  received_at INTEGER NOT NULL
);

-- entitlements: User access tracking (tier = 'pro' or 'team')
CREATE TABLE entitlements (
  customer_id TEXT PRIMARY KEY,
  tier TEXT NOT NULL,
  status TEXT NOT NULL,
  subscription_id TEXT,
  customer_email TEXT NOT NULL,
  amount_paid INTEGER,
  is_recurring INTEGER,
  updated_at INTEGER NOT NULL
);

-- license_keys: For one-time lifetime purchases
CREATE TABLE license_keys (
  license_key TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  tier TEXT NOT NULL,
  status TEXT NOT NULL,
  max_devices INTEGER DEFAULT 3,
  used_devices INTEGER DEFAULT 0
);
```

### Verify Entitlements

```bash
npx wrangler d1 execute rinawarp-prod --command \
"SELECT customer_id, tier, status, subscription_id, customer_email, updated_at FROM entitlements ORDER BY updated_at DESC LIMIT 10;"
```

### Configure Stripe Dashboard

1. Go to https://dashboard.stripe.com/webhooks
2. Add endpoint: `https://api.rinawarptech.com/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

### Prerequisites

1. **Stripe Account**: Set up at https://stripe.com
2. **Stripe CLI**: Install from https://stripe.com/docs/stripe-cli
3. **Products & Prices** (from Stripe Dashboard):

| Product | Price | Recurring | Price ID |
|---------|-------|-----------|----------|
| RinaWarp Pro (monthly) | $29.99/mo | ✅ | `price_1SOjFPGZrRdZy3W9IIm6ueBj` |
| RinaWarp Founder (lifetime) | $699 | ❌ | `price_1SOjEcGZrRdZy3W9PAbnoQ1p` |
| RinaWarp Team (monthly) | $49.99/mo | ✅ | `price_1SOjFXGZrRdZy3W9bNz4HpfN` |
| RinaWarp Pioneer (lifetime) | $800 | ❌ | `price_1SOjEdGZrRdZy3W9ll2FuOTW` |

**Tiers:**
- **Pro**: $29.99/mo or $699 lifetime
- **Team**: $49.99/mo or $800 lifetime

**Run these commands to verify:**
```bash
stripe login
stripe prices list --active=true --limit 100
```

### Webhook Setup

#### 1. Set Stripe Secrets

```bash
# Production secrets
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_PUBLISHABLE_KEY

# List secrets to verify
wrangler secret list --env production
```

#### 2. Verify Webhook Endpoint

```bash
# Test webhook is reachable
curl -sSI https://api.rinawarptech.com/api/stripe/webhook | head -5

# Expected: HTTP/1.1 405 Method Not Allowed (correct for POST-only)
```

#### 3. Test Webhook Flow

```bash
# Terminal 1: Forward webhooks to local or production
stripe listen --forward-to https://api.rinawarptech.com/api/stripe/webhook

# Terminal 2: Trigger test event
stripe trigger checkout.session.completed
```

#### 4. Idempotency Table

Create D1 table for webhook deduplication:

```sql
CREATE TABLE IF NOT EXISTS stripe_events (
  event_id TEXT PRIMARY KEY,
  received_at INTEGER NOT NULL,
  processed_at INTEGER,
  event_type TEXT
);

-- Index for cleanup
CREATE INDEX IF NOT EXISTS idx_stripe_events_received_at ON stripe_events(received_at);
```

### End-to-End Test Checklist

- [ ] Create checkout session in Stripe test mode
- [ ] Complete payment with test card (4242 4242 4242 4242)
- [ ] Verify webhook receives `checkout.session.completed`
- [ ] Check database shows new entitlement record
- [ ] User account shows "Pro" status
- [ ] Download links become accessible

---

## Code Signing

### macOS

#### Requirements

1. **Apple Developer Account**: $99/year
2. **Developer ID Certificate**: For distribution outside App Store
3. **Notarization**: Required for macOS Catalina+

#### Verification

```bash
# Verify code signature
codesign -dv --verbose=4 "RinaWarp Terminal Pro.app"

# Verify notarization (critical!)
spctl --assess --type execute --verbose "RinaWarp Terminal Pro.app"

# Verify DMG
spctl --assess --type open --verbose "RinaWarp-Terminal-Pro-1.0.0.dmg"
```

#### Must-Pass Criteria

- `codesign` shows valid signature with TeamIdentifier
- `spctl --assess` returns `accepted` (not `rejected`)
- No "damaged" or "unidentified developer" warnings

### Windows

#### Requirements

1. **EV Code Signing Certificate**: From DigiCert, Sectigo, or similar
2. **Timestamp Server**: For signature longevity

#### Verification

```powershell
# PowerShell
Get-AuthenticodeSignature .\RinaWarp-Terminal-Pro-1.0.0.exe | Format-List

# SignTool (Windows SDK)
signtool verify /pa .\RinaWarp-Terminal-Pro-1.0.0.exe
```

#### Must-Pass Criteria

- Status: `Valid`
- Publisher shows "RinaWarp Technologies LLC"
- No SmartScreen warnings

### Linux

#### AppImage Signing

```bash
# Generate signature
gpg --armor --detach-sign RinaWarp-Terminal-Pro-1.0.0.AppImage

# Verify signature
gpg --verify RinaWarp-Terminal-Pro-1.0.0.AppImage.asc RinaWarp-Terminal-Pro-1.0.0.AppImage
```

---

## Production Checklist

### Domain & SSL

- [ ] `rinawarptech.com` resolves to production
- [ ] `www.rinawarptech.com` resolves to production
- [ ] `api.rinawarptech.com` resolves to API
- [ ] `downloads.rinawarptech.com` resolves to R2
- [ ] All domains have valid SSL certificates (Cloudflare)

### Cloudflare Pages

- [ ] Marketing site deployed to Production (`rinawarptech-website` project - Git-connected)
- [ ] Deploy: `cd rinawarptech-website && npx wrangler pages deploy web --project-name rinawarptech-website --branch master`
- [ ] Legal pages accessible:
  - [ ] https://www.rinawarptech.com/terms/
  - [ ] https://www.rinawarptech.com/privacy/
  - [ ] https://www.rinawarptech.com/refunds/
  - [ ] https://www.rinawarptech.com/eula/

### Cloudflare Workers Routes

**Important:** Use Workers routes (not Pages _redirects) for reliable routing:

| Route | Target | Purpose |
|-------|--------|---------|
| `rinawarptech.com/api/*` | stripe-webhook-worker | Stripe webhooks + download tokens |
| `www.rinawarptech.com/downloads/*` | downloads-worker | Gated artifact downloads |

**Setup (Cloudflare Dashboard):**

1. Workers & Pages → rinawarp-downloads → Triggers → Routes → Add `www.rinawarptech.com/downloads/*`
2. Workers & Pages → stripe-webhook-worker → Triggers → Routes → Add `rinawarptech.com/api/*`

### R2 Storage

- [ ] `rinawarp-installers` bucket created
- [ ] All 7 installer files uploaded (use `./deploy/upload-and-verify.sh` for fail-fast)
- [ ] Public access configured (or signed URLs working)
- [ ] CORS configured for downloads

### Stripe

- [ ] Products created and priced
- [ ] Webhook configured in Stripe Dashboard
- [ ] Webhook secret stored in Cloudflare Secrets
- [ ] Idempotency table created in D1
- [ ] Test mode working (use test card 4242 4242 4242 4242)
- [ ] Switched to Live mode for launch

### Application

- [ ] Installers built for all platforms
- [ ] Code signing verified for all platforms
- [ ] Update mechanism configured
- [ ] Error reporting configured

### Legal & Compliance

- [ ] Terms of Service published
- [ ] Privacy Policy published
- [ ] Refund Policy published
- [ ] EULA published
- [ ] Contact information valid
- [ ] Company information accurate (RinaWarp Technologies LLC)

### Marketing

- [ ] Landing page complete
- [ ] Feature screenshots updated
- [ ] Pricing page accurate
- [ ] Contact page functional
- [ ] Social media links work

---

## Pre-Flight Verification (Run Before Upload)

These checks ensure routing, TTL, and security are working:

```bash
# A) Verify /downloads/* routes to Worker (not Pages HTML)
curl -sSI "https://rinawarptech.com/downloads/" | egrep -i "HTTP/|server|cf-ray|location"
curl -sSI "https://www.rinawarptech.com/downloads/" | egrep -i "HTTP/|server|cf-ray|location"
# Look for Cloudflare/Worker headers (cf-ray, worker), not Pages HTML

# B) Verify token TTL is 24h
curl -sS "https://rinawarp-downloads.rinawarptech.workers.dev/api/download-token?customer_id=cus_TEST" \
  | python - <<'PY'
import sys, json, time
d=json.load(sys.stdin)
exp=d.get("expires_at") or d.get("exp")
print("expires_at:", exp)
if exp:
  print("hours:", round((exp - int(time.time()*1000))/3600000, 2))
PY

# C) Verify revoked entitlement blocks downloads
npx wrangler d1 execute rinawarp-prod --command \
  "UPDATE entitlements SET status='canceled' WHERE customer_id='cus_TEST';"

TOKEN="$(curl -sS "https://rinawarp-downloads.rinawarptech.workers.dev/api/download-token?customer_id=cus_TEST" \
  | python -c "import sys,json; print(json.load(sys.stdin).get('token',''))")"

curl -sSI "https://rinawarptech.com/downloads/RinaWarp-Terminal-Pro-1.0.0.dmg?token=$TOKEN" | head -n 5
# Should return 401 or 403 (not 200)

# Restore entitlement
npx wrangler d1 execute rinawarp-prod --command \
  "UPDATE entitlements SET status='active' WHERE customer_id='cus_TEST';"

# D) Check for leaked secrets in git
rg -n "whsec_|sk_live_|t0XJ|Bearer " . || true
git log -p -n 20 | rg -n "whsec_|sk_live_|Authorization: Bearer" || true
```

---

## Cross-Platform Release Commands (v1.0.0)

These commands cover building, signing, normalizing, hashing, uploading, and smoke testing.

### 0) Repo root setup

```bash
cd /home/karina/Documents/rinawarp-terminal-pro
export VER="1.0.0"
```

### 1) macOS (run on Mac)

Build DMG:

```bash
cd apps/terminal-pro
rm -rf dist dist-electron node_modules
npm ci
npm run dist:mac
cd ../..

# Normalize DMG filename into apps/terminal-pro/dist/
OUT="apps/terminal-pro/dist"
DMG="$(ls "$OUT"/*.dmg | head -n 1)"
mv -f "$DMG" "$OUT/RinaWarp-Terminal-Pro-$VER.dmg"
ls -lah "$OUT/RinaWarp-Terminal-Pro-$VER.dmg"
```

Sign + notarize (run from repo root so relative paths work):

```bash
cd /home/karina/Documents/rinawarp-terminal-pro

export APPLE_ID="you@appleid.com"
export TEAM_ID="ABCDE12345"
export APP_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export SIGN_ID="Developer ID Application: Your Name (ABCDE12345)"

# Choose the correct .app folder (first one that exists)
APP_PATH="apps/terminal-pro/dist/mac/RinaWarp Terminal Pro.app"
[ -d "$APP_PATH" ] || APP_PATH="apps/terminal-pro/dist/mac-arm64/RinaWarp Terminal Pro.app"
[ -d "$APP_PATH" ] || APP_PATH="apps/terminal-pro/dist/mac-x64/RinaWarp Terminal Pro.app"
[ -d "$APP_PATH" ] || APP_PATH="apps/terminal-pro/dist/mac-universal/RinaWarp Terminal Pro.app"

./deploy/macos-sign-notarize.sh "$APP_PATH"
```

### 2) Windows (run on Windows PowerShell)

```powershell
cd C:\path\to\rinawarp-terminal-pro
$ver="1.0.0"

cd apps\terminal-pro
Remove-Item -Recurse -Force dist, dist-electron, node_modules -ErrorAction SilentlyContinue
npm ci
npm run dist:win
cd ..\..

# Normalize EXE name into apps\terminal-pro\dist\
$out="apps\terminal-pro\dist"
$exe = Get-ChildItem "$out\*.exe" | Select-Object -First 1
Move-Item $exe.FullName "$out\RinaWarp-Terminal-Pro-$ver.exe" -Force
dir "$out\RinaWarp-Terminal-Pro-$ver.exe"
```

Sign the EXE:

```powershell
cd C:\path\to\rinawarp-terminal-pro

powershell -ExecutionPolicy Bypass -File deploy\windows-sign.ps1 `
  -FilePath "apps\terminal-pro\dist\RinaWarp-Terminal-Pro-1.0.0.exe" `
  -PfxPath "C:\path\to\cert.pfx" `
  -PfxPassword "PASSWORD"
```

### 3) Linux RPM (optional, run on Fedora/RHEL)

```bash
cd /home/karina/Documents/rinawarp-terminal-pro/apps/terminal-pro
npm ci
npm run dist:linux
cd ../..

export VER="1.0.0"
OUT="apps/terminal-pro/dist"

if ls "$OUT"/*.rpm >/dev/null 2>&1; then
  mv -f "$OUT"/*.rpm "$OUT/RinaWarp-Terminal-Pro-$VER.x86_64.rpm"
fi

ls -lah "$OUT" | sed -n '1,120p'
```

### 4) Collect all artifacts (recommended: Linux)

If DMG/EXE were built on Mac/Windows, copy them into Linux release folder:

```bash
# From Linux machine (repo root)
# scp user@mac:/path/to/rinawarp-terminal-pro/apps/terminal-pro/dist/RinaWarp-Terminal-Pro-1.0.0.dmg apps/terminal-pro/dist/
# scp user@win:/path/to/rinawarp-terminal-pro/apps/terminal-pro/dist/RinaWarp-Terminal-Pro-1.0.0.exe apps/terminal-pro/dist/
```

### 5) Generate SHA256 + update downloads page

**Important:** Run after all files are normalized into `apps/terminal-pro/dist/`:

```bash
cd /home/karina/Documents/rinawarp-terminal-pro
export VER="1.0.0"
export DIST_DIR="apps/terminal-pro/dist"

./deploy/update-hashes.sh

git add rinawarptech-website/web/download/index.html
git commit -m "Update v$VER SHA256 hashes"
git push
```

### 6) Upload artifacts to R2

```bash
cd /home/karina/Documents/rinawarp-terminal-pro
export VER="1.0.0"
export BUCKET="rinawarp-installers"
export DIST_DIR="apps/terminal-pro/dist"

FILES=(
  "RinaWarp-Terminal-Pro-$VER.dmg"
  "RinaWarp-Terminal-Pro-$VER.exe"
  "RinaWarp-Terminal-Pro-$VER.AppImage"
  "RinaWarp-Terminal-Pro-$VER.amd64.deb"
  # Optional:
  # "RinaWarp-Terminal-Pro-$VER.x86_64.rpm"
)

# fail-fast
for f in "${FILES[@]}"; do
  test -f "$DIST_DIR/$f" || { echo "❌ Missing $DIST_DIR/$f"; exit 1; }
done

# upload
for f in "${FILES[@]}"; do
  echo "⬆️ Uploading $f"
  npx wrangler r2 object put "$BUCKET/$f" --file "$DIST_DIR/$f"
done
```

### 7) Smoke test (entitlement → token → download)

Seed test entitlement:

```bash
npx wrangler d1 execute rinawarp-prod --command \
"INSERT OR REPLACE INTO entitlements (customer_id, tier, status, customer_email, subscription_id, updated_at)
 VALUES ('cus_TEST', 'team', 'active', 'test@rinawarptech.com', NULL, strftime('%s','now')*1000);"
```

Mint token:

```bash
TOKEN="$(curl -sS "https://rinawarp-downloads.rinawarptech.workers.dev/api/download-token?customer_id=cus_TEST" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")"

echo "TOKEN=${TOKEN:0:8}... (redacted)"
```

Verify gated download works:

```bash
export VER="1.0.0"
curl -sSI "https://www.rinawarptech.com/downloads/RinaWarp-Terminal-Pro-$VER.AppImage?token=$TOKEN" \
  | egrep -i "HTTP/|content-type:|content-disposition:"
```

Verify no-token is blocked (expected: 401 or 403):

```bash
curl -sSI "https://www.rinawarptech.com/downloads/RinaWarp-Terminal-Pro-$VER.AppImage" \
  | egrep -i "HTTP/|content-type:"
```

---

## Launch Day One-Liner

If this exits 0, you're live:

```bash
npm run build:prod && ./deploy/upload-and-verify.sh && \
curl -sSI https://api.rinawarptech.com/api/stripe/webhook | egrep -i "HTTP/" && \
curl -s https://www.rinawarptech.com/terms/ | grep -E "RinaWarp Technologies LLC|Delaware|support@rinawarptech.com" -n
```

Expected output:
- Build completes successfully
- All 7 artifacts uploaded to R2
- All download checks pass (HTTP 200, binary content, attachment)
- Webhook returns 405 for GET (correct)
- Legal page contains company info

---

## Rate Limiting Setup (KV-Based)

### Step 1: Create KV Namespace

```bash
cd downloads-worker
npx wrangler kv namespace create RATE_LIMIT
npx wrangler kv namespace create RATE_LIMIT --preview
```

### Step 2: Update wrangler.toml

Copy the IDs from step 1 and uncomment the KV binding:

```toml
[[kv_namespaces]]
binding = "RATE_LIMIT"
id = "PASTE_PROD_ID"
preview_id = "PASTE_PREVIEW_ID"
```

### Step 3: Deploy

```bash
npx wrangler deploy
```

The rate limiter is already integrated:
- `/api/download-token`: 30 requests/minute/IP
- Returns 429 with `{"error":"rate_limited"}` when exceeded

---

## Final Launch Checklist

Run this before declaring launch ready:

- [ ] `./deploy/upload-and-verify.sh` passes all checks
- [ ] All 7 artifacts in R2 with correct sizes
- [ ] Token verification: all return HTTP 200 + attachment
- [ ] No-token verification: returns 401/403
- [ ] No artifacts served as text/html
- [ ] Webhook returns 405 for GET requests
- [ ] Marketing legal pages accessible
- [ ] Revoked entitlement blocks access
- [ ] Token TTL is 24 hours
- [ ] No leaked secrets in git
- [ ] Rate limiting configured (recommended)

---

## Rollback Plan

If issues are detected:

1. **Downloads broken**: Check R2 bucket and Worker routing
2. **Payments failing**: Verify Stripe secrets and webhook status
3. **Signing issues**: Re-sign binaries and re-upload to R2
4. **Site down**: Check Cloudflare Pages deployment status

### Quick Revert

```bash
# Revert to previous deployment
wrangler pages deployment revert --project-name=rinawarp-marketing

# Or rollback Stripe to test mode
# (change in Stripe Dashboard)
```

---

## Quick Launch Command

```bash
./deploy/launch.sh
```

This runs: build + upload + verify + post-launch checks.

If it exits 0, you're live! 🚀

---

## Support Contacts

- **Cloudflare**: https://dash.cloudflare.com/support
- **Stripe**: https://support.stripe.com
- **Apple Developer**: https://developer.apple.com/support
- **DigiCert**: https://www.digicert.com/support

---

*Last Updated: 2026-02-03*
*Version: 1.0.0*
