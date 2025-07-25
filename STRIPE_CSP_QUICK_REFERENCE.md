# 🚀 Stripe CSP Quick Reference Guide

## 🔧 What Was Fixed

1. **Server CSP Configuration**: Fixed `frameSrc: ['self']` to `frameSrc: ["'self'"]` in `server.js` line 291
2. **Created Deployment Script**: `deploy-with-csp-fix.sh` - comprehensive deployment with CSP testing
3. **CSP Test Page**: Automatically creates `/stripe-csp-test.html` for production testing
4. **Cloudflare Fix Guide**: Step-by-step instructions for Transform Rules

## ⚡ Quick Deploy

```bash
# Make sure you're in the project directory
cd /Users/kgilley/rinawarp-terminal

# Run the comprehensive deployment script
./deploy-with-csp-fix.sh
```

## 🧪 Immediate Testing

After deployment, test these URLs:

1. **CSP Test Page**: https://rinawarptech.com/stripe-csp-test.html
2. **Main Site**: https://rinawarptech.com
3. **Pricing Page**: https://rinawarptech.com/pricing.html

## 🚨 If Stripe is Still Blocked

You'll see `frame-src 'none'` in production headers. This means Cloudflare is overriding your settings.

### Fix in Cloudflare (2 minutes):

1. **Go to**: Cloudflare Dashboard → rinawarptech.com → Rules → Transform Rules
2. **Create**: "Modify Response Header" rule
3. **Name**: `Fix CSP for Stripe Integration`
4. **Condition**: Hostname equals `rinawarptech.com`
5. **Action**: Set dynamic header `Content-Security-Policy`
6. **Expression**: 
   ```javascript
   "default-src 'self'; script-src 'self' https://js.stripe.com 'unsafe-inline'; frame-src 'self' https://js.stripe.com https://hooks.stripe.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' wss: ws: https://api.stripe.com; object-src 'none'; base-uri 'self'; form-action 'self'; script-src-attr 'none'; upgrade-insecure-requests"
   ```

## 🔍 Quick Diagnostics

```bash
# Check current production CSP
curl -I https://rinawarptech.com | grep -i content-security-policy

# Run local CSP diagnostic
node fix-production-csp.js

# Test Stripe configuration
node test-csp-stripe.js
```

## 📋 Files Created/Modified

- ✅ `server.js` - Fixed CSP frameSrc configuration
- 🆕 `deploy-with-csp-fix.sh` - Comprehensive deployment script
- 🆕 `cloudflare-csp-transform-rule.md` - Cloudflare configuration guide
- 🆕 `public/stripe-csp-test.html` - Auto-created during deployment
- 🆕 `deployment-results.md` - Generated after deployment

## 🎯 Success Indicators

- ✅ No CSP violations in browser console
- ✅ Stripe Elements load and create iframes
- ✅ Payment checkout flows work
- ✅ CSP header includes `frame-src 'self' https://js.stripe.com https://hooks.stripe.com`

## 🚨 Emergency Quick Fix

If you need Stripe working immediately (temporarily less secure):

1. **In server.js line 291**, temporarily change to:
   ```javascript
   frameSrc: ["'self'", 'https://js.stripe.com', 'https://hooks.stripe.com', "'unsafe-inline'"],
   ```

2. **Or add to Cloudflare Transform Rule**:
   ```javascript
   "default-src 'self'; script-src 'self' https://js.stripe.com 'unsafe-inline'; frame-src 'self' https://js.stripe.com https://hooks.stripe.com 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' wss: ws: https://api.stripe.com; object-src 'none'"
   ```

**Remember to revert to secure settings once working!**

## 📞 Support

If issues persist after following this guide:

1. **Check**: Browser Dev Tools → Console for specific CSP errors
2. **Test**: The CSP test page for detailed diagnostics  
3. **Verify**: Cloudflare Transform Rule is active and has priority 1
4. **Contact**: Support with browser console screenshots

---

*Your server configuration is now correct. If Stripe is still blocked, it's a Cloudflare override that needs the Transform Rule fix above.*
