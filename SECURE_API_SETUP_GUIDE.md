# 🔒 SECURE API KEY SETUP GUIDE

## ✅ How to Add Your New Stripe Keys SAFELY

### **NEVER DO THIS:**
```bash
# ❌ WRONG - Don't put keys directly in code
const stripe = Stripe('pk_live_actual_key_here');

# ❌ WRONG - Don't commit keys to git
git add config.js  # file containing real keys
```

### **✅ DO THIS INSTEAD:**

## 1. 🛡️ CREATE YOUR .env FILE

```bash
# Copy the template to create your actual environment file
cp .env.example .env

# Edit the .env file with your REAL keys (this file is already in .gitignore)
nano .env
```

## 2. 📝 ADD YOUR NEW KEYS TO .env

Open `.env` and replace the placeholder values:

```bash
# Stripe Configuration - LIVE KEYS
STRIPE_SECRET_KEY=sk_live_YOUR_ACTUAL_NEW_SECRET_KEY_FROM_STRIPE
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_ACTUAL_NEW_PUBLISHABLE_KEY_FROM_STRIPE  
STRIPE_WEBHOOK_SECRET=whsec_YOUR_ACTUAL_NEW_WEBHOOK_SECRET_FROM_STRIPE

# Other keys you need to replace:
SENDGRID_API_KEY=SG.YOUR_ACTUAL_NEW_SENDGRID_KEY
GOOGLE_API_KEY=YOUR_ACTUAL_NEW_GOOGLE_KEY
SENTRY_DSN=https://YOUR_ACTUAL_NEW_SENTRY_DSN
```

## 3. 🔍 VERIFY .env IS IN .gitignore

```bash
# Check that .env is ignored (should see it listed)
grep -n "\.env" .gitignore
```

If `.env` is NOT in `.gitignore`, add it:

```bash
echo ".env" >> .gitignore
```

## 4. 💻 USE ENVIRONMENT VARIABLES IN CODE

In your JavaScript/Node.js files:

```javascript
// ✅ CORRECT - Use environment variables
require('dotenv').config();

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

// For client-side (only publishable key)
const stripe = Stripe(process.env.STRIPE_PUBLISHABLE_KEY);
```

## 5. 🚀 DEPLOYMENT - Railway/Vercel/Heroku

### For Railway:
```bash
# Set environment variables in Railway dashboard or CLI
railway variables set STRIPE_SECRET_KEY=sk_live_your_actual_key
railway variables set STRIPE_PUBLISHABLE_KEY=pk_live_your_actual_key
railway variables set STRIPE_WEBHOOK_SECRET=whsec_your_actual_secret
```

### For Vercel:
```bash
# Set via Vercel CLI or dashboard
vercel env add STRIPE_SECRET_KEY
vercel env add STRIPE_PUBLISHABLE_KEY  
vercel env add STRIPE_WEBHOOK_SECRET
```

### For Heroku:
```bash
# Set via Heroku CLI or dashboard
heroku config:set STRIPE_SECRET_KEY=sk_live_your_actual_key
heroku config:set STRIPE_PUBLISHABLE_KEY=pk_live_your_actual_key
heroku config:set STRIPE_WEBHOOK_SECRET=whsec_your_actual_secret
```

## 6. 🧪 TEST YOUR SETUP

Create a test file to verify your keys are loaded:

```javascript
// test-env.js
require('dotenv').config();

console.log('Environment check:');
console.log('Stripe Secret Key:', process.env.STRIPE_SECRET_KEY ? '✅ Loaded' : '❌ Missing');
console.log('Stripe Publishable Key:', process.env.STRIPE_PUBLISHABLE_KEY ? '✅ Loaded' : '❌ Missing');
console.log('Webhook Secret:', process.env.STRIPE_WEBHOOK_SECRET ? '✅ Loaded' : '❌ Missing');

// Test Stripe connection
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
stripe.balance.retrieve()
  .then(() => console.log('✅ Stripe API connection successful'))
  .catch(err => console.log('❌ Stripe API error:', err.message));
```

Run the test:
```bash
node test-env.js
```

## 7. 🗑️ CLEAN UP DANGEROUS FILES

Remove any files that contained the old exposed keys:

```bash
# Remove dangerous deployment scripts
rm -f add-secret-and-deploy.sh
rm -f add-stripe-env-vars.sh

# Make sure they're removed from git
git rm add-secret-and-deploy.sh add-stripe-env-vars.sh 2>/dev/null || true
git add -A
git commit -m "Remove files with exposed secrets"
git push origin main
```

---

## 🚨 SECURITY CHECKLIST

Before deploying with your new keys:

- [ ] ✅ New Stripe keys generated and old ones revoked
- [ ] ✅ Keys stored in `.env` file (not in code)
- [ ] ✅ `.env` file is in `.gitignore`  
- [ ] ✅ Environment variables set in your deployment platform
- [ ] ✅ Tested that keys load properly
- [ ] ✅ Old dangerous files removed from repository
- [ ] ✅ Code uses `process.env.VARIABLE_NAME` format
- [ ] ✅ No keys visible in git history

---

## 🛡️ BEST PRACTICES SUMMARY

1. **Environment Variables Only**: Never hardcode keys in source code
2. **Use .env for Local**: Keep `.env` in `.gitignore` 
3. **Platform Variables for Production**: Use Railway/Vercel/Heroku env vars
4. **Restrict Key Permissions**: Use least privilege principle in Stripe dashboard
5. **Regular Rotation**: Rotate keys periodically for security
6. **Monitor Usage**: Watch for unusual API activity in service dashboards

---

**✨ Your keys are now secure and your repository is clean!**
