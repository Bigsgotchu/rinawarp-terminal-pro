# 🔗 STRIPE WEBHOOK SETUP WITH CLI

## Current Webhook Status:
✅ **Stripe CLI installed** (v1.28.0)  
✅ **Logged into Stripe account** (RinaWarp Technologies)  
⚠️  **No live mode webhooks** currently configured  
⚠️  **Test mode webhook disabled** (https://yourdomain.com/webhook)  

---

## 🚀 **OPTION 1: CREATE NEW LIVE WEBHOOK**

### Step 1: Create Live Mode Webhook
```bash
# Create a new webhook for your live domain
stripe webhook_endpoints create \
  --url "https://rinawarptech.com/api/stripe/webhook" \
  --enabled-events "customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.payment_succeeded,invoice.payment_failed,payment_intent.succeeded" \
  --live
```

### Step 2: Get the Webhook Secret
```bash
# List webhooks to get the ID
stripe webhook_endpoints list --live

# Get the signing secret for your webhook (replace WEBHOOK_ID)
stripe webhook_endpoints retrieve WEBHOOK_ID --live
```

---

## 🧪 **OPTION 2: TEST LOCALLY WITH STRIPE CLI**

### Forward webhooks to local development:
```bash
# Forward Stripe webhooks to your local server
stripe listen --forward-to localhost:3000/api/stripe/webhook

# This will output a webhook signing secret like:
# whsec_1234567890abcdef...
```

### Use the local webhook secret:
```bash
# The CLI will show you the webhook secret to use in your .env
# Add it to your .env file:
echo "STRIPE_WEBHOOK_SECRET=whsec_LOCAL_SECRET_FROM_CLI" >> .env
```

---

## 🔧 **RECOMMENDED WEBHOOK EVENTS**

For a typical SaaS application, enable these events:

```bash
# Core subscription events
customer.subscription.created
customer.subscription.updated  
customer.subscription.deleted

# Payment events
invoice.payment_succeeded
invoice.payment_failed
payment_intent.succeeded
payment_intent.payment_failed

# Customer events  
customer.created
customer.updated
customer.deleted

# Optional: All events (for comprehensive tracking)
*
```

---

## 📋 **QUICK COMMANDS**

### List all webhooks:
```bash
stripe webhook_endpoints list --live          # Live mode
stripe webhook_endpoints list                 # Test mode
```

### Create webhook with common events:
```bash
stripe webhook_endpoints create \
  --url "https://rinawarptech.com/api/stripe/webhook" \
  --enabled-events "customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.payment_succeeded,invoice.payment_failed" \
  --live
```

### Get webhook details (replace WEBHOOK_ID):
```bash
stripe webhook_endpoints retrieve WEBHOOK_ID --live
```

### Update webhook URL (replace WEBHOOK_ID):
```bash
stripe webhook_endpoints update WEBHOOK_ID \
  --url "https://rinawarptech.com/api/stripe/webhook" \
  --live
```

### Delete webhook (replace WEBHOOK_ID):
```bash
stripe webhook_endpoints delete WEBHOOK_ID --live
```

---

## 🛡️ **WEBHOOK SECURITY BEST PRACTICES**

1. **Always verify webhook signatures** in your code:
```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// In your webhook handler
const sig = req.headers['stripe-signature'];
let event;

try {
  event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
} catch (err) {
  console.log(`Webhook signature verification failed.`, err.message);
  return res.status(400).send(`Webhook Error: ${err.message}`);
}
```

2. **Use HTTPS only** for production webhooks
3. **Handle webhook retries** (Stripe retries failed webhooks)
4. **Make webhook endpoint idempotent** (handle duplicate events)

---

## 🎯 **NEXT STEPS**

1. **Choose your approach**:
   - **Production**: Create live webhook with Option 1
   - **Development**: Use local forwarding with Option 2

2. **Update your .env** with the webhook secret
3. **Test your webhook** endpoint
4. **Deploy with environment variables**

---

## 🚨 **WEBHOOK ENDPOINT REQUIREMENTS**

Your webhook endpoint should:
- Return HTTP 200 for successful processing
- Process webhooks quickly (< 10 seconds)  
- Handle webhook retries gracefully
- Verify webhook signatures
- Be idempotent (handle duplicate events)

Example endpoint: `https://rinawarptech.com/api/stripe/webhook`
