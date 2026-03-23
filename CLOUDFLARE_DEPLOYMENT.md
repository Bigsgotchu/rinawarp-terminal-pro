# Cloudflare Worker Deployment Guide

## Prerequisites

- Cloudflare account (free tier works)
- Domain: rinawarptech.com
- Wrangler CLI installed
- R2 storage enabled

## Setup Steps

### 1. Install Wrangler

```bash
npm install -g wrangler
# or
yarn global add wrangler
```

### 2. Login to Cloudflare

```bash
wrangler login
```

This opens a browser window to authenticate.

### 3. Create R2 Bucket

```bash
wrangler r2 bucket create rinawarp-releases
```

Confirm creation:
```bash
wrangler r2 bucket list
```

### 4. Set Secrets

```bash
# Stripe Secret Key
wrangler secret put STRIPE_SECRET_KEY
# Paste your sk_live_... key when prompted

# Stripe Webhook Secret
wrangler secret put STRIPE_WEBHOOK_SECRET
# Paste your whsec_... key when prompted

# Auth Secret (for JWT signing)
wrangler secret put AUTH_SECRET
# Generate: openssl rand -base64 32
```

### 5. Configure Domain

Update `wrangler.toml`:

```toml
name = "rinawarp-terminal-pro-api"
main = "worker.ts"
compatibility_date = "2024-01-01"

[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "rinawarp-releases"

[vars]
ENVIRONMENT = "production"

# Production route
[routes]
pattern = "api.rinawarptech.com/*"
zone_name = "rinawarptech.com"

# Update feed route
[[routes]]
pattern = "updates.rinawarptech.com/*"
zone_name = "rinawarptech.com"
```

### 6. Deploy Worker

```bash
cd /app/cloudflare-worker
yarn install
wrangler deploy
```

Output:
```
✨ Successfully published your Worker to:
   https://rinawarp-terminal-pro-api.workers.dev
   https://api.rinawarptech.com
   https://updates.rinawarptech.com
```

### 7. Test Endpoints

```bash
# Health check
curl https://api.rinawarptech.com/api/health

# Latest version
curl https://updates.rinawarptech.com/api/updates/latest

# Update feed (for electron-updater)
curl https://updates.rinawarptech.com/api/updates/darwin
```

## Upload Release Artifacts

### 1. Build Desktop App

```bash
cd /app
yarn build
yarn package
```

This creates installers in `release/`:
- `RinaWarp-Terminal-Pro-0.1.0.dmg` (macOS)
- `RinaWarp-Terminal-Pro-Setup-0.1.0.exe` (Windows)
- `RinaWarp-Terminal-Pro-0.1.0.AppImage` (Linux)

### 2. Upload to R2

```bash
# macOS installer
wrangler r2 object put rinawarp-releases/releases/v0.1.0/RinaWarp-Terminal-Pro-0.1.0.dmg \
  --file ./release/RinaWarp-Terminal-Pro-0.1.0.dmg \
  --content-type application/x-apple-diskimage

# Windows installer
wrangler r2 object put rinawarp-releases/releases/v0.1.0/RinaWarp-Terminal-Pro-Setup-0.1.0.exe \
  --file ./release/RinaWarp-Terminal-Pro-Setup-0.1.0.exe \
  --content-type application/x-msdownload

# Linux AppImage
wrangler r2 object put rinawarp-releases/releases/v0.1.0/RinaWarp-Terminal-Pro-0.1.0.AppImage \
  --file ./release/RinaWarp-Terminal-Pro-0.1.0.AppImage \
  --content-type application/x-executable
```

### 3. Upload Update Feed Files

Create `latest.json`:
```json
{
  "version": "0.1.0",
  "releaseDate": "2026-01-23",
  "notes": "Initial release - Proof-first AI agent workbench with GPT-5.1",
  "platforms": {
    "darwin": {
      "url": "https://updates.rinawarptech.com/download/v0.1.0/RinaWarp-Terminal-Pro-0.1.0.dmg",
      "sha512": "...",
      "size": 123456789
    },
    "win32": {
      "url": "https://updates.rinawarptech.com/download/v0.1.0/RinaWarp-Terminal-Pro-Setup-0.1.0.exe",
      "sha512": "...",
      "size": 123456789
    },
    "linux": {
      "url": "https://updates.rinawarptech.com/download/v0.1.0/RinaWarp-Terminal-Pro-0.1.0.AppImage",
      "sha512": "...",
      "size": 123456789
    }
  }
}
```

Upload:
```bash
wrangler r2 object put rinawarp-releases/releases/latest.json \
  --file ./release/latest.json \
  --content-type application/json
```

Create platform-specific YAML files for electron-updater:

`darwin-latest.yml`:
```yaml
version: 0.1.0
files:
  - url: RinaWarp-Terminal-Pro-0.1.0.dmg
    sha512: ...
    size: 123456789
path: RinaWarp-Terminal-Pro-0.1.0.dmg
sha512: ...
releaseDate: '2026-01-23T00:00:00.000Z'
```

Upload:
```bash
wrangler r2 object put rinawarp-releases/releases/darwin-latest.yml \
  --file ./release/latest-mac.yml \
  --content-type text/yaml

wrangler r2 object put rinawarp-releases/releases/win32-latest.yml \
  --file ./release/latest.yml \
  --content-type text/yaml

wrangler r2 object put rinawarp-releases/releases/linux-latest.yml \
  --file ./release/latest-linux.yml \
  --content-type text/yaml
```

## DNS Configuration

### 1. Add DNS Records

In Cloudflare Dashboard → DNS:

**For API:**
```
Type: CNAME
Name: api
Content: rinawarp-terminal-pro-api.workers.dev
Proxy: Enabled (orange cloud)
```

**For Updates:**
```
Type: CNAME
Name: updates
Content: rinawarp-terminal-pro-api.workers.dev
Proxy: Enabled (orange cloud)
```

### 2. Add Worker Routes

In Cloudflare Dashboard → Workers → Routes:

```
Route: api.rinawarptech.com/*
Worker: rinawarp-terminal-pro-api
```

```
Route: updates.rinawarptech.com/*
Worker: rinawarp-terminal-pro-api
```

## Stripe Configuration

### 1. Create Products

In Stripe Dashboard → Products:

**Free Plan:**
- Name: RinaWarp Terminal Pro - Free
- Price: $0
- Metadata: `plan=free`

**Pro Plan:**
- Name: RinaWarp Terminal Pro - Pro
- Price: $29/month
- Metadata: `plan=pro`

**Enterprise Plan:**
- Name: RinaWarp Terminal Pro - Enterprise
- Price: Custom
- Metadata: `plan=enterprise`

### 2. Set Up Webhooks

In Stripe Dashboard → Webhooks:

**Endpoint URL:**
```
https://api.rinawarptech.com/api/billing/webhook
```

**Events to send:**
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

Copy webhook signing secret and set it:
```bash
wrangler secret put STRIPE_WEBHOOK_SECRET
```

## Monitoring & Logs

### View Worker Logs

```bash
wrangler tail
```

### View R2 Objects

```bash
wrangler r2 object list rinawarp-releases --prefix releases/
```

### Check Worker Analytics

```bash
wrangler dev --remote
```

Or view in Cloudflare Dashboard → Workers → Analytics

## Deployment Checklist

- [ ] Wrangler installed and logged in
- [ ] R2 bucket created (`rinawarp-releases`)
- [ ] Secrets configured (Stripe keys, auth secret)
- [ ] Worker deployed
- [ ] DNS records added (api, updates)
- [ ] Worker routes configured
- [ ] Release artifacts uploaded to R2
- [ ] Update feed files uploaded (latest.json, YAML)
- [ ] Stripe products created
- [ ] Stripe webhooks configured
- [ ] Test all endpoints
- [ ] Monitor logs

## Testing

```bash
# Test API health
curl https://api.rinawarptech.com/api/health

# Test update feed
curl https://updates.rinawarptech.com/api/updates/latest

# Test download (should redirect to R2)
curl -I https://updates.rinawarptech.com/download/v0.1.0/RinaWarp-Terminal-Pro-0.1.0.dmg

# Test Stripe checkout (requires valid data)
curl -X POST https://api.rinawarptech.com/api/billing/checkout \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","plan":"pro"}'
```

## Troubleshooting

**Worker not found:**
- Check `wrangler.toml` routes
- Verify DNS records
- Check worker routes in Cloudflare dashboard

**R2 objects not accessible:**
- Verify bucket binding in `wrangler.toml`
- Check object exists: `wrangler r2 object list`
- Verify CORS if needed

**Stripe webhooks failing:**
- Check webhook secret is set correctly
- Verify webhook signature validation in worker code
- Check Stripe dashboard for delivery attempts

## Updates

To deploy a new version:

1. Update version in `package.json`
2. Build new installers
3. Upload to R2 with new version folder
4. Update `latest.json` and YAML files
5. Desktop apps will auto-update on launch

## Cost Estimate

**Cloudflare (Free Tier):**
- 100,000 worker requests/day: Free
- 10 GB R2 storage: Free
- 10 million R2 reads/month: Free

**Above free tier:**
- Worker requests: $0.50 per million
- R2 storage: $0.015 per GB/month
- R2 reads: $0.36 per million

**Stripe:**
- 2.9% + $0.30 per transaction
- No monthly fee

## Security

- All secrets stored in Cloudflare encrypted storage
- Worker has no access to sensitive keys in code
- HTTPS enforced on all endpoints
- Stripe webhook signature validation
- JWT validation for authenticated endpoints
