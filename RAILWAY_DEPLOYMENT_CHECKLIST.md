# 🚂 RinaWarp Terminal - Railway Deployment Checklist

## ✅ Current Status
- [x] Domain configured: https://rinawarptech.com
- [x] Railway domain working: https://rinawarp-terminal-production-adfe.up.railway.app
- [x] Server configured with Express.js
- [x] Payment endpoints configured (`/api/create-checkout-session`)
- [x] Webhook endpoints configured (`/webhook` and `/api/webhook`)
- [x] Static file serving configured

## 🧹 Cleanup Completed
- [x] Removed Netlify configuration files
- [x] Removed Vercel-specific files
- [x] Removed redundant API directory

## 📋 Environment Variables Checklist

### Required Variables (Already in Railway)
- [ ] `STRIPE_SECRET_KEY` - Your Stripe secret key
- [ ] `STRIPE_PRICE_ID` - Default price ID for checkout
- [ ] `STRIPE_WEBHOOK_SECRET` - Webhook endpoint secret from Stripe
- [ ] `NODE_ENV` - Set to "production"
- [ ] `PORT` - Railway provides this automatically

### Optional Variables (for full functionality)
- [ ] `SMTP_HOST` - Email server host
- [ ] `SMTP_PORT` - Email server port (default: 587)
- [ ] `SMTP_USER` - Email username
- [ ] `SMTP_PASS` - Email password
- [ ] `SENDGRID_API_KEY` - Alternative to SMTP
- [ ] `SENDGRID_FROM_EMAIL` - Sender email for SendGrid

## 🔧 Stripe Configuration

### 1. Update Webhook Endpoint in Stripe Dashboard
```
https://rinawarptech.com/webhook
https://rinawarptech.com/api/webhook
```

### 2. Events to Listen For:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`

## 🚀 Deployment Steps

### 1. Verify Railway Configuration
```bash
# Check current Railway service
railway status

# View current environment variables
railway variables
```

### 2. Update Environment Variables
```bash
# Set production variables if not already set
railway variables set NODE_ENV=production
railway variables set STRIPE_SECRET_KEY="your-stripe-secret-key"
railway variables set STRIPE_WEBHOOK_SECRET="your-webhook-secret"
```

### 3. Deploy to Railway
```bash
# Deploy latest changes
railway up

# Or use Git push if connected
git add .
git commit -m "Remove Vercel/Netlify dependencies, consolidate to Railway"
git push origin main
```

### 4. Verify Deployment
- [ ] Check https://rinawarptech.com is loading
- [ ] Test API endpoint: https://rinawarptech.com/api/status
- [ ] Test download endpoint: https://rinawarptech.com/api/download
- [ ] Test payment flow on pricing page

## 📁 File Structure Verification

### Public Directory (Static Files)
```
public/
├── index.html          # Landing page
├── pricing.html        # Pricing page with Stripe integration
├── download.html       # Download page
├── success.html        # Payment success page
├── main.css           # Main styles
├── phase2-ui.css      # Additional styles
├── js/
│   ├── purchasePlan.js # Stripe checkout integration
│   └── payment-fix.js  # Payment helpers
└── releases/          # Binary downloads
```

### API Structure (in src/api/)
```
src/api/
├── status.js          # Health check endpoint
├── download.js        # Download management
├── auth.js           # Authentication
├── gateway.js        # API gateway
└── ai.js            # AI features
```

## 🔍 Testing Checklist

### 1. Basic Functionality
```bash
# Test health endpoint
curl https://rinawarptech.com/health

# Test API status
curl https://rinawarptech.com/api/status
```

### 2. Payment Flow
1. Navigate to https://rinawarptech.com/pricing.html
2. Click on any pricing plan
3. Verify Stripe checkout loads
4. Complete test payment
5. Verify redirect to success page

### 3. Webhook Testing
```bash
# Use Stripe CLI to test webhooks
stripe listen --forward-to https://rinawarptech.com/webhook

# In another terminal, trigger test event
stripe trigger checkout.session.completed
```

## 🐛 Troubleshooting

### Common Issues and Solutions

1. **500 Error on Payment**
   - Check `STRIPE_SECRET_KEY` is set correctly
   - Verify price IDs match your Stripe dashboard

2. **Webhook Failures**
   - Ensure `STRIPE_WEBHOOK_SECRET` is set
   - Check webhook endpoint is accessible
   - Verify webhook events are configured in Stripe

3. **Static Files Not Loading**
   - Check `public/` directory structure
   - Verify file permissions
   - Check Railway logs: `railway logs`

## 📊 Monitoring

### Railway Dashboard
- Monitor deployment status
- Check resource usage
- View real-time logs

### Application Logs
```bash
# View live logs
railway logs -f

# View last 100 lines
railway logs -n 100
```

## 🎉 Post-Deployment

1. **Update DNS Records** (if needed)
   - Ensure rinawarptech.com points to Railway
   - Check SSL certificate is active

2. **Monitor Performance**
   - Check response times
   - Monitor error rates
   - Track successful payments

3. **Update Documentation**
   - Remove references to Vercel/Netlify
   - Update deployment guides
   - Update contributor documentation

## 📝 Notes

- Railway automatically handles SSL certificates
- Railway provides automatic scaling
- All environment variables are encrypted
- Deployments are atomic (zero-downtime)

---

Last Updated: ${new Date().toISOString()}
