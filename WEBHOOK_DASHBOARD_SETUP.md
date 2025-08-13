# 🚀 WEBHOOK SETUP VIA STRIPE DASHBOARD

I've opened the Stripe Webhooks dashboard for you. The CLI has limited permissions, so we'll create the webhook through the dashboard instead.

## 📋 **STEP-BY-STEP WEBHOOK CREATION**

### 1. **In the Stripe Dashboard (just opened):**

**Click "Add endpoint"** or **"Create webhook"**

### 2. **Configure Webhook Settings:**

**Endpoint URL:**
```
https://rinawarptech.com/api/stripe/webhook
```

**Description (optional):**
```
RinaWarp Production Webhook
```

**Events to send:** Select these important events:
```
✅ customer.subscription.created
✅ customer.subscription.updated
✅ customer.subscription.deleted
✅ invoice.payment_succeeded
✅ invoice.payment_failed
✅ payment_intent.succeeded
✅ payment_intent.payment_failed
```

**Or select "All events" if you want comprehensive tracking**

### 3. **After Creating the Webhook:**

1. Click on your newly created webhook
2. In the **"Signing secret"** section, click **"Reveal"**
3. Copy the webhook secret (starts with `whsec_`)

### 4. **Add Secret to Your .env File:**

```bash
# Open your .env file
code .env

# Add this line with your actual webhook secret:
STRIPE_WEBHOOK_SECRET=whsec_YOUR_ACTUAL_WEBHOOK_SECRET_HERE
```

---

## 🧪 **ALTERNATIVE: LOCAL TESTING**

If you want to test webhooks locally first:

```bash
# Forward webhooks to your local development server
stripe listen --forward-to localhost:3000/api/stripe/webhook

# This will show you a local webhook secret like:
# > Ready! Your webhook signing secret is whsec_1234567890abcdef...
```

Add the local secret to your `.env`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_LOCAL_SECRET_FROM_CLI_OUTPUT
```

---

## ✅ **VERIFY YOUR SETUP**

After adding the webhook secret to `.env`:

```bash
# Test that all your environment variables are loaded
node test-env.js

# You should see:
# ✅ Stripe Secret Key: Loaded
# ✅ Stripe Publishable Key: Loaded  
# ✅ Stripe Webhook Secret: Loaded
```

---

## 🔍 **CHECK WEBHOOK STATUS WITH CLI**

After creating via dashboard, verify with CLI:

```bash
# List your live webhooks (should now show your new webhook)
stripe webhook_endpoints list --live

# Get details of a specific webhook (replace WEBHOOK_ID)
stripe webhook_endpoints retrieve WEBHOOK_ID --live
```

---

## 📝 **WEBHOOK ENDPOINT CODE EXAMPLE**

Your webhook endpoint should look something like this:

```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

app.post('/api/stripe/webhook', express.raw({type: 'application/json'}), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.log(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'customer.subscription.created':
      console.log('New subscription created:', event.data.object);
      break;
    case 'invoice.payment_succeeded':
      console.log('Payment succeeded:', event.data.object);
      break;
    // ... handle other events
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({received: true});
});
```

---

**🎯 Complete these steps in the Stripe dashboard, then run `node test-env.js` to verify everything is set up correctly!**
