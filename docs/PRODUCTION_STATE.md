# Production State

## Cloudflare

- Production site: https://www.rinawarptech.com
- Staging site: https://rinawarptech-website.pages.dev
- Worker: website Worker (handles /api routes)
- D1 database: rinawarp-users
- R2 bucket: rinawarp-releases (for downloads)

### Required Secrets (DO NOT COMMIT VALUES)

- `SENDGRID_API_KEY` - Email delivery for beta signup/confirmation
- `BETA_ADMIN_TOKEN` - Admin access to beta management endpoints
- `STRIPE_WEBHOOK_SECRET` - Webhook signature verification
- `RINA_ENCRYPTION_SECRET` - Runtime encryption key

## Deployed Routes

- `/beta` - Beta signup landing
- `/beta-feedback` - Beta feedback form
- `/download` - Download redirect endpoint
- `/releases/SHASUMS256.txt` - Release signature checksums
- `/api/beta-signup` - Beta signup API handler
- `/api/beta-feedback` - Beta feedback submission
- `/api/beta-admin/digest` - Admin digest endpoint (requires BETA_ADMIN_TOKEN)

## Production-only State

**Do not commit:**
- Real secret values
- D1 data exports unless redacted
- Cloudflare deployment tokens
- Stripe API keys
- SendGrid credentials

**Do record in docs:**
- Secret names exist (this file)
- Route availability
- Database schema (in schema files, not data)

## Health Checks

- `/api/health` - Basic health check endpoint
- `/api/health/detailed` - Detailed diagnostics (requires auth)

## Last Updated

`provenance: git commit before every production change`
`update-date: 2026-06-03`