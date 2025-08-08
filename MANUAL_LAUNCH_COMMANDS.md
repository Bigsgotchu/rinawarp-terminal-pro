# 🚀 Manual CLI Commands for RinaWarp Terminal Launch

## Option 1: Automated Script (Recommended)

Just run this single command to launch everything automatically:

```bash
./launch-revenue-script.sh
```

## Option 2: Manual Step-by-Step Commands

If you prefer to run commands manually, follow these steps:

### Step 1: Get Stripe Keys (Browser)
1. Stripe dashboard is already open
2. Switch to LIVE mode
3. Get your keys: `pk_live_...`, `sk_live_...`, `whsec_...`

### Step 2: Update Environment Variables

```bash
# Backup original file
cp .env.development .env.development.backup

# Replace with your real keys (substitute YOUR_ACTUAL_KEYS)
sed -i '' 's|STRIPE_SECRET_KEY={{STRIPE_SECRET_KEY}}|STRIPE_SECRET_KEY=sk_live_YOUR_ACTUAL_KEY|g' .env.development
sed -i '' 's|STRIPE_PUBLISHABLE_KEY={{STRIPE_PUBLISHABLE_KEY}}|STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_ACTUAL_KEY|g' .env.development  
sed -i '' 's|STRIPE_WEBHOOK_SECRET={{STRIPE_WEBHOOK_SECRET}}|STRIPE_WEBHOOK_SECRET=whsec_YOUR_ACTUAL_SECRET|g' .env.development
```

### Step 3: Commit and Deploy

```bash
# Commit all changes
git add .
git commit -m "Add distributed tracing and prepare for production deployment"

# Login to Railway (if needed)
railway login

# Create new Railway project
railway project create rinawarp-terminal

# Set environment variables on Railway
railway variables set STRIPE_SECRET_KEY="sk_live_YOUR_ACTUAL_KEY"
railway variables set STRIPE_PUBLISHABLE_KEY="pk_live_YOUR_ACTUAL_KEY"
railway variables set STRIPE_WEBHOOK_SECRET="whsec_YOUR_ACTUAL_SECRET"
railway variables set NODE_ENV="production"
railway variables set APP_VERSION="1.0.6"
railway variables set ENABLE_TELEMETRY="true"
railway variables set SENTRY_DSN="https://4c22d2c576b2d0ebbeda9941d59fff95@o4509759638536192.ingest.us.sentry.io/4509759649087488"
railway variables set SENTRY_ENVIRONMENT="production"

# Deploy to Railway
railway up --detach

# Generate domain (if needed)
railway domain generate

# Get your app URL
railway domain
```

### Step 4: Get Your App URL

```bash
# Your app URL
echo "Your app is live at: $(railway domain)"

# Open pricing page for testing  
open "$(railway domain)/pricing"
```

### Step 5: Test Payment

1. Visit the pricing page that just opened
2. Click "Get Started" on any plan
3. Use test card: `4242 4242 4242 4242`
4. Complete checkout

### Step 6: Create Social Media Post

```bash
# Create social media launch post
cat > social_media_launch.txt << EOF
🚀 LAUNCHING: RinaWarp Terminal! 

The world's most advanced AI-powered terminal with:
🧠 AI command suggestions  
🎤 Voice control
🎨 Beautiful themes
🛡️ Enterprise security
⚡ Lightning fast performance

Early bird pricing starting at \$15/month
Get yours now: $(railway domain)/pricing

#Terminal #AI #Developer #Productivity #RinaWarp
EOF

# View the post
cat social_media_launch.txt
```

### Step 7: Open Key Dashboards

```bash
# Open Railway dashboard
open "https://railway.app/dashboard"

# Open Stripe dashboard
open "https://dashboard.stripe.com"

# View your live app
open "$(railway domain)/pricing"
```

## 🎯 Quick Commands Summary

The fastest way to launch (after getting Stripe keys):

```bash
# 1. Update environment (replace with your real keys)
sed -i '' 's|{{STRIPE_SECRET_KEY}}|sk_live_YOUR_KEY|g' .env.development
sed -i '' 's|{{STRIPE_PUBLISHABLE_KEY}}|pk_live_YOUR_KEY|g' .env.development
sed -i '' 's|{{STRIPE_WEBHOOK_SECRET}}|whsec_YOUR_SECRET|g' .env.development

# 2. Deploy
git add . && git commit -m "Production deployment"
railway login
railway project create rinawarp-terminal
railway variables set STRIPE_SECRET_KEY="sk_live_YOUR_KEY"
railway variables set STRIPE_PUBLISHABLE_KEY="pk_live_YOUR_KEY"
railway variables set STRIPE_WEBHOOK_SECRET="whsec_YOUR_SECRET"
railway variables set NODE_ENV="production"
railway up --detach

# 3. Get URL and test
railway domain
open "$(railway domain)/pricing"
```

## 🚨 Important Notes

- **Security**: Never commit real Stripe keys to git
- **Testing**: Use `4242 4242 4242 4242` for test payments
- **Webhooks**: Update Stripe webhook URL to `your-app.railway.app/webhook/stripe`
- **Marketing**: Start social media promotion immediately after testing

## 💰 You're Ready to Make Money!

Once deployed and tested, you have a fully functional SaaS business generating revenue at:
- Personal Plan: $15/month
- Professional Plan: $25/month  
- Team Plan: $35/month

**Total setup time: ~90 minutes**
**Time to first revenue: ~2 hours**
