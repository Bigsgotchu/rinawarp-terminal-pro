# 🚨 EMERGENCY: Revoke Exposed API Keys

**IMMEDIATE ACTION REQUIRED** - These keys were exposed in your public repository and must be revoked NOW.

## 🔥 EXPOSED CREDENTIALS FOUND:

1. **Google API Key**: `AIzaSyAx4RY1Hw_5WFTbB-qpOHwk0bncKJm1m6o`
2. **SendGrid API Key**: `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`
3. **Sentry DSN**: `https://4c22d2c576b2d0ebbeda9941d59fff95@o4509759638536192.ingest.us.sentry.io/4509759649087488`
4. **Stripe Keys** (from deployment script):
   - Publishable: `pk_live_51RaxSiG2ToGP7Chntmrt8SEr2jO7MxKH6Y6XtFS4MttiPvE5DkQ67aNNzjfnhn9J4SPKRVW0qCIqHF2OjO9T04Vr00qtnxd5Qj`
   - Webhook Secret: `whsec_fbadeda8b97b36502e8533789148532b1ad3e7f2f3f8fe837f21e5c5f507836d`

---

## 1. 🔴 REVOKE GOOGLE API KEY

### Step 1: Access Google Cloud Console
```bash
open "https://console.cloud.google.com/apis/credentials"
```

### Step 2: Find and Delete the Key
1. Look for API key: `AIzaSyAx4RY1Hw_5WFTbB-qpOHwk0bncKJm1m6o`
2. Click the **three dots menu** next to it
3. Select **"Delete"**
4. Confirm deletion

### Step 3: Create New Key (if needed)
1. Click **"+ CREATE CREDENTIALS"**
2. Select **"API key"**
3. **IMMEDIATELY** click **"RESTRICT KEY"**
4. Set application restrictions (HTTP referrers, IP addresses, etc.)
5. Set API restrictions to only the APIs you need
6. Save the new key securely

---

## 2. 📧 REVOKE SENDGRID API KEY

### Step 1: Access SendGrid Dashboard
```bash
open "https://app.sendgrid.com/settings/api_keys"
```

### Step 2: Find and Delete the Key
1. Look for the API key starting with: `SG.jxDVrhgoTPudsKQev...`
2. Click the **gear icon** or **"Action"** menu
3. Select **"Delete"**
4. Confirm deletion

### Step 3: Create New Key (if needed)
1. Click **"Create API Key"**
2. Choose **"Restricted Access"** (not Full Access)
3. Only enable the permissions you actually need:
   - Mail Send (if sending emails)
   - Template Engine (if using templates)
   - DO NOT enable billing, user management, etc.
4. Give it a descriptive name like "RinaWarp-Production"
5. Save the new key securely

---

## 3. 🐛 REVOKE SENTRY DSN

### Step 1: Access Sentry Dashboard
```bash
open "https://sentry.io/settings/"
```

### Step 2: Navigate to Project Settings
1. Go to your RinaWarp project
2. Click **"Settings"** in the left sidebar
3. Click **"Client Keys (DSN)"**

### Step 3: Regenerate or Delete DSN
1. Find the DSN containing: `4c22d2c576b2d0ebbeda9941d59fff95`
2. Click **"Configure"** or **"..."** menu
3. Either:
   - **"Regenerate"** the DSN (creates new one)
   - **"Delete"** it entirely
4. Update your applications with the new DSN

---

## 4. 💳 REVOKE STRIPE KEYS

### Step 1: Access Stripe Dashboard
```bash
open "https://dashboard.stripe.com/apikeys"
```

### Step 2: Roll (Regenerate) Keys
1. **LIVE MODE**: Make sure you're in "Live" mode (not Test)
2. Find **"Publishable key"** starting with `pk_live_51RaxSiG2ToGP7Ch...`
   - Click **"Roll key"** 
   - This generates a new key and invalidates the old one
3. Find **"Secret key"** (if visible, starting with `sk_live_...`)
   - Click **"Roll key"**
   - This generates a new key and invalidates the old one

### Step 3: Update Webhook Secrets
```bash
open "https://dashboard.stripe.com/webhooks"
```
1. Find your webhook endpoint
2. Click to edit it
3. In the **"Signing secret"** section:
   - Click **"Reveal"** to see current secret
   - If it matches `whsec_fbadeda8b97b36502e8533789148532b1ad3e7f2f3f8fe837f21e5c5f507836d`
   - Click **"Roll secret"** to generate a new one
4. Update your application with the new webhook secret

---

## 5. 🧹 CLEAN UP REPOSITORY

After revoking the keys, remove the dangerous files:

```bash
# Remove the dangerous deployment script
rm add-secret-and-deploy.sh

# Remove any other files with secrets
rm add-stripe-env-vars.sh

# Make sure they're not committed
git rm add-secret-and-deploy.sh add-stripe-env-vars.sh 2>/dev/null || true
git add -A
git commit -m "Remove files containing exposed secrets"
git push origin main
```

---

## 6. ✅ VERIFICATION CHECKLIST

After completing all revocations:

- [ ] Google API Key deleted and new one created with restrictions
- [ ] SendGrid API Key deleted and new restricted one created  
- [ ] Sentry DSN regenerated or deleted
- [ ] Stripe Publishable Key rolled
- [ ] Stripe Secret Key rolled (if you had one active)
- [ ] Stripe Webhook Secret rolled
- [ ] Dangerous files removed from repository
- [ ] Changes committed and pushed to GitHub
- [ ] New keys securely stored in environment variables only
- [ ] Applications updated with new keys

---

## 🛡️ PREVENTION MEASURES

1. **Never commit secrets**: Always use environment variables
2. **Use .env.example**: Template files with placeholder values only
3. **Pre-commit hooks**: Install git hooks to scan for secrets
4. **Regular scans**: Run security scans periodically
5. **Restrict permissions**: Use least-privilege principle for all API keys

---

## 🚨 IF YOU SUSPECT UNAUTHORIZED USAGE

1. **Monitor immediately**:
   - Check Google Cloud Console for unusual API usage
   - Check SendGrid for unexpected email sends
   - Check Stripe for unauthorized transactions
   - Check Sentry for unusual error patterns

2. **Contact support** if you see suspicious activity:
   - Google Cloud Support
   - SendGrid Support  
   - Stripe Support
   - Sentry Support

---

**⚠️ DO NOT DELAY - Revoke these keys immediately to prevent unauthorized access to your services!**
