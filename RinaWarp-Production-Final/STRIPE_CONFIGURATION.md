# 🔐 Stripe Configuration Guide

**Setting up payment processing for RinaWarp Terminal**

---

## 📋 **Prerequisites**

1. Stripe account (create at [stripe.com](https://stripe.com))
2. Node.js backend server ready
3. Website hosted and accessible

---

## 🔑 **Step 1: Get Stripe API Keys**

### **1. Create Stripe Account**
- Go to [dashboard.stripe.com](https://dashboard.stripe.com)
- Sign up or log in
- Complete account verification

### **2. Get API Keys**
Navigate to **Developers > API keys** in your Stripe dashboard:

- **Publishable key** (starts with `pk_`): Used on your website frontend
- **Secret key** (starts with `sk_`): Used on your backend server
- **Webhook signing secret**: Generated when you create webhook endpoints

### **3. Test vs Live Keys**
- **Test keys**: Use during development (`pk_test_` and `sk_test_`)
- **Live keys**: Use in production (`pk_live_` and `sk_live_`)

---

## 💰 **Step 2: Create Products and Prices**

### **1. Create Products**
In Stripe Dashboard → **Products**:

**Pro Plan:**
- Name: "RinaWarp Terminal Pro"
- Description: "Professional AI-powered terminal with unlimited features"

**Team Plan:**
- Name: "RinaWarp Terminal Team"  
- Description: "Team collaboration features and shared configurations"

### **2. Create Prices**
For each product, create recurring prices:

**Pro Plan Price:**
- Type: Recurring
- Amount: $9.99
- Interval: Monthly
- Currency: USD
- Copy the price ID (starts with `price_`)

**Team Plan Price:**
- Type: Recurring  
- Amount: $29.99
- Interval: Monthly
- Currency: USD
- Copy the price ID (starts with `price_`)

---

## 🔌 **Step 3: Configure Webhooks**

### **1. Create Webhook Endpoint**
In Stripe Dashboard → **Developers > Webhooks**:

- **Endpoint URL**: `https://yourdomain.com/webhook`
- **Listen to**: Events on your account
- **Select events**:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`  
  - `invoice.payment_failed`

### **2. Get Webhook Secret**
After creating the webhook:
- Click on the webhook endpoint
- Reveal the **Signing secret** (starts with `whsec_`)
- Copy this secret

---

## 🔧 **Step 4: Environment Variables**

### **1. Backend Environment (.env)**
Create/update your backend `.env` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Price IDs (from Step 2)
STRIPE_PRO_PRICE_ID=price_1234567890abcdef_pro
STRIPE_TEAM_PRICE_ID=price_1234567890abcdef_team

# Other Configuration
NODE_ENV=development
PORT=3000
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

### **2. Frontend Configuration (script.js)**
Update the `CONFIG` object in your website's `script.js`:

```javascript
const CONFIG = {
    stripePublishableKey: 'pk_test_your_stripe_publishable_key_here',
    apiBaseUrl: 'https://api.yourdomain.com',
    stripePriceIds: {
        pro: 'price_1234567890abcdef_pro',
        team: 'price_1234567890abcdef_team'
    },
    // ... rest of config
};
```

---

## 🚀 **Step 5: Test the Integration**

### **1. Test Card Numbers**
Use these test cards (Stripe test mode only):

- **Successful payment**: `4242 4242 4242 4242`
- **Declined payment**: `4000 0000 0000 0002`  
- **Requires authentication**: `4000 0025 0000 3155`

### **2. Test the Flow**
1. Start your backend server
2. Open your website
3. Click "Start Pro Trial" or "Start Team Trial"
4. Complete checkout with test card
5. Verify license creation in your backend logs
6. Test download functionality

### **3. Test Webhooks**
- Use Stripe CLI for local testing: `stripe listen --forward-to localhost:3000/webhook`
- Or use ngrok to expose your local server
- Complete a test payment and check webhook delivery in Stripe Dashboard

---

## 🌍 **Step 6: Production Deployment**

### **1. Switch to Live Mode**
In Stripe Dashboard:
- Toggle from "Test mode" to "Live mode"
- Get your live API keys
- Update price IDs for live products
- Update webhook endpoints to production URLs

### **2. Update Environment Variables**
Replace test keys with live keys:

```bash
STRIPE_SECRET_KEY=sk_live_your_live_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_live_webhook_secret
NODE_ENV=production
```

### **3. Security Checklist**
- ✅ Never expose secret keys in frontend code
- ✅ Use HTTPS in production
- ✅ Validate all webhook signatures
- ✅ Set up proper CORS origins
- ✅ Enable rate limiting
- ✅ Set up monitoring and alerting

---

## 📊 **Step 7: Customer Portal (Optional)**

### **1. Enable Customer Portal**
In Stripe Dashboard → **Settings > Billing > Customer portal**:

- Enable customer portal
- Configure portal settings:
  - Allow customers to update payment methods
  - Allow subscription cancellation
  - Allow downloading invoices

### **2. Integration**
The backend already includes portal session creation:

```javascript
// Frontend call
const response = await fetch('/api/create-portal-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        customerId: 'cus_customer_id',
        returnUrl: window.location.origin
    })
});
```

---

## 🔍 **Troubleshooting**

### **Common Issues:**

**❌ "No such price" error**
- Check that price IDs match exactly
- Ensure you're using the correct test/live mode

**❌ Webhook signature verification failed**
- Verify webhook secret is correct
- Check that raw body is passed to webhook handler
- Ensure webhook URL is accessible

**❌ "Invalid API key" error**  
- Check that you're using the right key for test/live mode
- Verify the key has correct permissions

**❌ Payment fails immediately**
- Check if using test card numbers in test mode
- Verify Stripe account is activated
- Check for any account restrictions

### **Debug Tools:**
- **Stripe Dashboard**: View all events and logs
- **Stripe CLI**: Test webhooks locally
- **Stripe API logs**: See all API requests
- **Backend logs**: Check your application logs

---

## 📈 **Monitoring & Analytics**

### **Key Metrics to Track:**
- Checkout conversion rates
- Failed payment attempts  
- Subscription churn rates
- Revenue by plan type
- Customer lifetime value

### **Stripe Dashboard Insights:**
- Payments overview
- Customer analytics
- Revenue reports
- Failed payment analysis
- Subscription metrics

---

## ✅ **Final Checklist**

Before going live:

- [ ] **Stripe account fully verified**
- [ ] **Products and prices created**
- [ ] **Webhook endpoints configured**
- [ ] **API keys updated in environment variables**
- [ ] **Payment flow tested end-to-end**
- [ ] **Download system tested**
- [ ] **License validation working**
- [ ] **Customer portal configured (optional)**
- [ ] **Monitoring and logging set up**
- [ ] **Security measures in place**

---

## 🆘 **Support**

If you need help:
- **Stripe Documentation**: [stripe.com/docs](https://stripe.com/docs)
- **Stripe Support**: Available in dashboard
- **RinaWarp Support**: support@rinawarptech.com

---

*Your payment system is now ready for production! 🎉*
