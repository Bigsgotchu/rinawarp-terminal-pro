# RinaWarp Terminal Deployment Checklist

## Before Deployment

### 1. Environment Setup
- [ ] Copy `.env.production.template` to `.env.sentry`
- [ ] Fill in all required environment variables:
  - [ ] Stripe keys (live, not test)
  - [ ] Email service configuration
  - [ ] Sentry DSN
  - [ ] Session secret
- [ ] Update server details in `deploy.sh`:
  - [ ] SERVER_USER
  - [ ] SERVER_HOST

### 2. Stripe Configuration
- [ ] Create products and prices in Stripe Dashboard
- [ ] Set up webhook endpoint: https://rinawarptech.com/webhook
- [ ] Add webhook events:
  - [ ] checkout.session.completed
  - [ ] customer.subscription.updated
  - [ ] customer.subscription.deleted
  - [ ] invoice.payment_failed
- [ ] Test webhook with Stripe CLI

### 3. Application Binaries
- [ ] Build application for all platforms
- [ ] Upload binaries to `dist/` directory:
  - [ ] RinaWarp Terminal-3.0.0.dmg (Mac)
  - [ ] RinaWarp Terminal Setup 3.0.0.exe (Windows)
  - [ ] RinaWarp Terminal-3.0.0.AppImage (Linux)

### 4. Server Preparation
- [ ] Server has Node.js installed
- [ ] Server has Nginx installed
- [ ] Domain DNS points to server
- [ ] SSH access configured

## During Deployment

### 1. Run Deployment
```bash
chmod +x deploy.sh
./deploy.sh production
```

### 2. Verify Deployment
- [ ] Backend health check: https://rinawarptech.com/health
- [ ] Frontend loads: https://rinawarptech.com/
- [ ] SSL certificate valid
- [ ] Payment flow works
- [ ] Downloads work for each tier

## After Deployment

### 1. Monitoring
- [ ] Check logs: `ssh user@server 'tail -f /var/www/rinawarp/logs/combined.log'`
- [ ] Monitor PM2: `ssh user@server 'pm2 status'`
- [ ] Check Nginx status: `ssh user@server 'systemctl status nginx'`

### 2. Testing
- [ ] Test free download
- [ ] Test pro purchase and download
- [ ] Test team purchase and download
- [ ] Test dashboard functionality
- [ ] Test email notifications
- [ ] Test webhook processing

### 3. Analytics and Monitoring
- [ ] Set up uptime monitoring
- [ ] Configure error alerts
- [ ] Monitor payment success rates
- [ ] Track download metrics

## Troubleshooting

### Common Issues
- **502 Bad Gateway**: Backend not running or wrong port
- **SSL Issues**: Check Let's Encrypt certificate
- **Payment Failures**: Check Stripe webhook configuration
- **Download Issues**: Verify file paths and permissions

### Useful Commands
```bash
# Check backend logs
ssh user@server 'tail -f /var/www/rinawarp/logs/combined.log'

# Restart backend
ssh user@server 'pm2 restart rinawarp-api'

# Check Nginx config
ssh user@server 'nginx -t'

# Restart Nginx  
ssh user@server 'systemctl restart nginx'
```
