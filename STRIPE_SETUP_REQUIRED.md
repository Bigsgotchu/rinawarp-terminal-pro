# 🔧 Stripe Configuration Required

The checkout system is encountering an authentication error because Stripe API keys are not configured.

## Error Details
```
Error: You did not provide an API key. You need to provide your API key in the Authorization header, using Bearer auth (e.g. 'Authorization: Bearer YOUR_SECRET_KEY').
```

## 🚀 Quick Fix

### 1. Create a `.env` file in the project root:

```bash
# Copy the example file
cp .env.stripe.example .env
```

### 2. Add your Stripe API keys to the `.env` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here

# Stripe Price IDs (already configured)
STRIPE_PRICE_PERSONAL_MONTHLY=price_1RlLBwG2ToGP7ChnhstisPz0
STRIPE_PRICE_PROFESSIONAL_MONTHLY=price_1RlLC4G2ToGP7ChndbHLotM7
STRIPE_PRICE_TEAM_MONTHLY=price_1RlLCEG2ToGP7ChnZa5Px0ow
```

### 3. Get your Stripe API keys:

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Developers** → **API keys**
3. Copy the **Secret key** (starts with `sk_test_` for test mode)
4. Copy the **Publishable key** (starts with `pk_test_` for test mode)

### 4. Restart the server:

```bash
npm start
```

## 🧪 Test Mode vs Live Mode

**Currently using TEST mode** - This is safe for development:
- Test keys start with `sk_test_` and `pk_test_`
- No real payments will be processed
- Use test card numbers like `4242424242424242`

**For production**, use live keys:
- Live keys start with `sk_live_` and `pk_live_`
- Real payments will be processed
- Requires proper SSL certificate

## 🔍 Current Status

The system is already configured with:
- ✅ Checkout endpoint (`/api/create-checkout-session`)
- ✅ Price IDs for all plans
- ✅ Error handling and user feedback
- ❌ **Missing: Stripe API keys in environment variables**

## 📧 Need Help?

If you need assistance with Stripe setup, contact support@rinawarptech.com

---

**Note**: The conversion optimization system (A/B testing, exit-intent, mobile optimization, onboarding) is fully functional and tracking user behavior. Only the payment processing requires Stripe API keys to complete purchases.
