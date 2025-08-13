# 🚀 Railway Environment Variables Setup Guide

Since the Railway CLI is having connectivity issues, please add these environment variables manually through the Railway Dashboard.

## 📋 **Step-by-Step Instructions**

1. Go to [Railway Dashboard](https://railway.com/project)
2. Select your **"Rinawarp Terminal Enterprise"** project
3. Click on **"rinawarp-terminal"** service
4. Click on the **"Variables"** tab
5. Add each variable below by clicking **"New Variable"**

## 🔑 **Core Stripe Configuration** (REQUIRED)

```bash
# Stripe API Keys
STRIPE_SECRET_KEY={{REDACTED_SECRET}}
STRIPE_PUBLISHABLE_KEY={{REDACTED_SECRET}}
STRIPE_WEBHOOK_SECRET={{REDACTED_SECRET}}

# Main Price IDs (used by /api/stripe-config)
STRIPE_PRICE_ID=price_1RayttG2ToGP7Chn6ectv20s
STRIPE_PRICE_PERSONAL=price_1RayttG2ToGP7Chn6ectv20s
STRIPE_PRICE_PROFESSIONAL=price_1RayrzG2ToGP7ChnAM4BXGoH
STRIPE_PRICE_TEAM=price_1RayqKG2ToGP7ChnTMT6gwce

# Beta Pricing
STRIPE_PRICE_EARLYBIRD=price_1Rk9fCG2ToGP7ChnoyFdZTX0
STRIPE_PRICE_BETA=price_1Rk9fCG2ToGP7ChnkwgjPPdN
STRIPE_PRICE_PREMIUM=price_1Rk9fCG2ToGP7ChnocLnwjie
```

## 📧 **Email Configuration** (REQUIRED)

```bash
# SendGrid Configuration
SENDGRID_API_KEY={{REDACTED_SECRET}}
SENDGRID_FROM_EMAIL=noreply@rinawarptech.com

# SMTP Backup Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=rinawarptechnologies25@gmail.com
SMTP_FROM_EMAIL=noreply@rinawarptech.com
```

## 🚀 **Application Configuration** (RECOMMENDED)

```bash
# Production Environment
NODE_ENV=production
APP_VERSION=1.0.8

# Security
SECURITY_HEADERS_ENABLED=true
FORCE_HTTPS=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## ✅ **Already Configured** (NO ACTION NEEDED)

These are already set in your Railway environment:
- ✅ STRIPE_PRICE_PERSONAL_MONTHLY
- ✅ STRIPE_PRICE_PERSONAL_YEARLY  
- ✅ STRIPE_PRICE_PROFESSIONAL_MONTHLY
- ✅ STRIPE_PRICE_PROFESSIONAL_YEARLY
- ✅ STRIPE_PRICE_TEAM_MONTHLY
- ✅ STRIPE_PRICE_TEAM_YEARLY

## 🔄 **After Adding Variables**

1. **Automatic Deployment**: Railway will automatically redeploy your service
2. **Monitor Deployment**: Watch the deployment logs in Railway dashboard
3. **Test Configuration**: Once deployed, test these endpoints:

```bash
# Test Stripe configuration
curl https://rinawarptech.com/api/stripe-config

# Test health check
curl https://rinawarptech.com/health

# Test website
curl https://rinawarptech.com/
```

## 🎯 **Expected Results**

After adding these variables, you should see:

1. **✅ Stripe Config API** returns valid publishable key and prices
2. **✅ Payment Buttons** work correctly on pricing page
3. **✅ Email System** functions for license delivery
4. **✅ Clean Server Logs** with no missing environment variable warnings

## 🐛 **Troubleshooting**

If you encounter issues:

1. **Check Railway Logs**: Go to deployments tab and check latest logs
2. **Verify Variables**: Ensure all variables are saved without extra spaces
3. **Test Endpoints**: Use the curl commands above to test each service
4. **Check Secrets**: Make sure no variable contains `{{placeholder}}` text

## 📞 **Support**

If you need help:
- Check Railway deployment logs for specific error messages  
- Verify all variables were saved correctly in the dashboard
- Test the `/api/stripe-config` endpoint first as it's the foundation for payments

---

**Priority**: 🔴 Critical - Required for payment processing
**Estimated Time**: 10-15 minutes to add all variables
**Auto-Deploy**: Yes, Railway will redeploy automatically
