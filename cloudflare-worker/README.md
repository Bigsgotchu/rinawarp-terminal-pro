# RinaWarp Terminal Pro - Cloudflare Worker

This worker handles:
- Update feed for electron-updater
- Release download hosting via R2
- Billing/checkout with Stripe
- Account portal and license restoration

## Setup

1. Install dependencies:
```bash
cd cloudflare-worker
yarn install
```

2. Configure secrets:
```bash
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put AUTH_SECRET
```

3. Create R2 bucket:
```bash
wrangler r2 bucket create rinawarp-releases
```

4. Deploy:
```bash
yarn deploy
```

## Endpoints

### Updates
- `GET /api/updates/latest` - Latest version info
- `GET /api/updates/{platform}` - electron-updater feed (darwin/win32/linux)

### Downloads
- `GET /download/{version}/{filename}` - Download release files

### Billing
- `POST /api/billing/checkout` - Create checkout session
- `POST /api/billing/webhook` - Stripe webhook handler

### Account
- `POST /api/account/portal` - Customer portal
- `POST /api/account/restore` - License restoration
