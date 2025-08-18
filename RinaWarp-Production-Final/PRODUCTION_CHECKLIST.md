# RinaWarp Terminal - Production Deployment Checklist

## Pre-Deployment Tasks

### 1. Stripe Configuration ✅ (Partially Complete)
- [ ] **Switch to Live Mode in Stripe Dashboard**
- [ ] **Create Live Products & Prices**
  - [ ] Create "RinaWarp Terminal Pro" ($99/month)
  - [ ] Create "RinaWarp Terminal Team" ($79/month) 
  - [ ] Create "RinaWarp Terminal Beta Access" ($49 one-time)
  - [ ] Copy live price IDs to `.env.sentry`
- [ ] **Get Live API Keys**
  - [ ] Copy live publishable key to `.env.sentry`
  - [ ] Copy live secret key to `.env.sentry`
- [ ] **Setup Live Webhook**
  - [ ] Create webhook endpoint: `https://rinawarptech.com/webhook`
  - [ ] Enable events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
  - [ ] Copy webhook secret to `.env.sentry`

### 2. Email Configuration
- [ ] **Get SendGrid API Key**
  - [ ] Sign up at https://sendgrid.com
  - [ ] Create API key with "Mail Send" permissions
  - [ ] Add key to `.env.sentry` as `SENDGRID_API_KEY`
- [ ] **Verify Sender Identity**
  - [ ] Verify `noreply@rinawarptech.com` in SendGrid
  - [ ] Or setup domain authentication for `rinawarptech.com`

### 3. Security Configuration
- [ ] **Generate Production Session Secret**
  - [ ] Create 256-character random string
  - [ ] Update `SESSION_SECRET` in `.env.sentry`
- [ ] **Optional: Setup Sentry**
  - [ ] Create Sentry project
  - [ ] Add DSN to `.env.sentry`

### 4. Application Binaries
- [ ] **Upload RinaWarp Terminal Binaries**
  - [ ] `RinaWarp-Terminal-Setup-1.0.0.exe` (Windows)
  - [ ] `RinaWarp-Terminal-1.0.0.dmg` (macOS)
  - [ ] `rinawarp-terminal_1.0.0_amd64.deb` (Linux)
  - [ ] Upload to `/var/www/rinawarp/dist/` on server

### 5. DNS Configuration ✅ (Complete)
- [x] Domain `rinawarptech.com` pointed to server IP `18.212.105.169`
- [x] Cloudflare DNS configured

## Deployment Steps

### 1. Update Environment for Production
```bash
# Copy production template and update values
cp .env.production .env.sentry
# Edit .env.sentry with your production values
```

### 2. Run Production Deployment
```bash
# Execute deployment script
./deploy.sh production
```

### 3. Post-Deployment Verification
- [ ] **Test Website Access**
  - [ ] Visit https://rinawarptech.com
  - [ ] Verify SSL certificate
  - [ ] Check all pages load correctly
- [ ] **Test Payment Flow**
  - [ ] Click "Get Beta Access" 
  - [ ] Complete Stripe checkout
  - [ ] Verify email confirmation
  - [ ] Test download links
- [ ] **Monitor Logs**
  - [ ] Check application logs: `ssh -i ~/.ssh/rinawarp-key.pem ubuntu@18.212.105.169 'tail -f /var/www/rinawarp/logs/combined.log'`
  - [ ] Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`

## Important URLs

- **Production Website**: https://rinawarptech.com
- **Stripe Dashboard**: https://dashboard.stripe.com
- **SendGrid Console**: https://app.sendgrid.com
- **Server SSH**: `ssh -i ~/.ssh/rinawarp-key.pem ubuntu@18.212.105.169`

## Emergency Rollback

If deployment fails:
```bash
# Stop the application
ssh -i ~/.ssh/rinawarp-key.pem ubuntu@18.212.105.169 'pm2 stop rinawarp-api'

# Restore from backup if needed
# ... rollback commands ...

# Check status
ssh -i ~/.ssh/rinawarp-key.pem ubuntu@18.212.105.169 'pm2 status'
```

## Next Steps After Successful Deployment

1. **Marketing Launch**
   - [ ] Announce on social media
   - [ ] Update landing page with live purchase flow
   - [ ] Send emails to beta testers

2. **Monitoring Setup**
   - [ ] Setup uptime monitoring (Pingdom, UptimeRobot)
   - [ ] Configure Stripe webhook monitoring
   - [ ] Setup log aggregation (optional)

3. **Customer Support**
   - [ ] Monitor support emails
   - [ ] Test download delivery system
   - [ ] Verify license activation flow

---

**Current Status**: Ready for production deployment once Stripe live keys and SendGrid API key are configured.
