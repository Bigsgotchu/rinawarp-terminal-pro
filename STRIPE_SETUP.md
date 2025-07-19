# 🔄 Stripe Alternative Routes Setup Guide

## Current Status: ❌ Demo Mode

Stripe is currently running in **demo mode** with placeholder configuration. Here's how to set up real payment processing:

## 🚀 Option 1: Vercel Serverless Functions (Recommended)

### Setup Steps:
1. **Create Stripe Account**: Sign up at [stripe.com](https://stripe.com)
2. **Get API Keys**: 
   - Publishable Key: `pk_live_...` (production) or `pk_test_...` (test)
   - Secret Key: `sk_live_...` (production) or `sk_test_...` (test)

3. **Update Configuration**:
   ```bash
   # Edit /public/api/stripe-config.json
   {
     "publishableKey": "pk_live_YOUR_ACTUAL_KEY_HERE",
     "prices": {
       "personal": "price_YOUR_ACTUAL_PRICE_ID",
       "professional": "price_YOUR_ACTUAL_PRICE_ID",
       "team": "price_YOUR_ACTUAL_PRICE_ID"
     }
   }
   ```

4. **Set Environment Variables** (in Vercel Dashboard):
   ```
   STRIPE_SECRET_KEY=sk_live_YOUR_SECRET_KEY
   VERCEL_URL=https://rinawarptech.com
   ```

5. **Deploy to Vercel**:
   ```bash
   vercel --prod
   ```

## 🔥 Option 2: Netlify Functions

### Setup Steps:
1. **Deploy to Netlify**:
   ```bash
   netlify deploy --build --prod
   ```

2. **Set Environment Variables** (in Netlify Dashboard):
   ```
   STRIPE_SECRET_KEY=sk_live_YOUR_SECRET_KEY
   URL=https://rinawarptech.com
   ```

3. **The `netlify.toml` is already configured** ✅

## 🔗 Option 3: Stripe Payment Links (Easiest)

### Setup Steps:
1. **Create Payment Links** in Stripe Dashboard:
   - Go to Stripe Dashboard > Payment Links
   - Create links for each plan (Personal, Professional, Team)
   - Copy the generated URLs

2. **Update Payment Links Configuration**:
   ```bash
   # Edit /public/api/stripe-payment-links.json
   {
     "paymentLinks": {
       "personal": {
         "monthly": "https://buy.stripe.com/live_YOUR_LINK_HERE"
       },
       "professional": {
         "monthly": "https://buy.stripe.com/live_YOUR_LINK_HERE"  
       }
     }
   }
   ```

## 🧪 Testing Your Setup

1. **Test with Browser Console**:
   ```javascript
   // Go to https://rinawarptech.com/pricing.html
   // Open browser console and try:
   purchasePlan('professional')
   ```

2. **Check Console Logs**:
   - Look for: `✅ Stripe initialized successfully`
   - Or: `🔧 Demo mode: Using placeholder Stripe configuration`

## 🔧 Current Routing Strategy

The pricing page now tries multiple routes automatically:

```javascript
const routes = [
  '/api/create-checkout-session',           // Vercel/Firebase Functions  
  '/.netlify/functions/create-checkout-session', // Netlify Functions
  '/api/stripe-checkout'                     // Express server fallback
];
```

## 📝 Files Created

### ✅ Ready to Use:
- `public/api/stripe-config.json` - Configuration file
- `public/api/stripe-payment-links.json` - Payment links fallback
- `api/create-checkout-session.js` - Vercel serverless function
- `netlify/functions/create-checkout-session.js` - Netlify function
- `netlify.toml` - Netlify configuration
- `public/pricing.html` - Enhanced with multi-route logic

### 🔄 Next Steps:

1. **Choose your hosting platform** (Vercel recommended)
2. **Set up real Stripe keys** (replace placeholders)
3. **Create price products** in Stripe Dashboard
4. **Test payment flow** end-to-end
5. **Set up webhooks** for subscription management

## 💡 Quick Start Commands

```bash
# For Vercel deployment:
npm run deploy

# For Netlify deployment:  
netlify deploy --build --prod

# For Firebase (current):
firebase deploy --only hosting

# Test locally with Netlify:
netlify dev
```

## 🎯 Production Checklist

- [ ] Replace placeholder Stripe keys with real ones
- [ ] Create actual price IDs in Stripe Dashboard  
- [ ] Set environment variables on hosting platform
- [ ] Test payment flow with test cards
- [ ] Set up webhooks for subscription events
- [ ] Configure success/cancel page redirects
- [ ] Add proper error handling and logging
- [ ] Test on mobile devices

## 🚨 Security Notes

- **Never commit real secret keys to git**
- **Use environment variables for all secrets**
- **Enable webhook signing verification**
- **Use HTTPS only in production**
- **Validate all inputs server-side**

---

**Status**: Ready for production setup! Choose your preferred hosting option and follow the setup steps above.
