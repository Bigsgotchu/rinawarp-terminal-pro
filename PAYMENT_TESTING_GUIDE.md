# 💳 RinaWarp Payment Testing Guide

## 🎯 Testing Payment Flow with Stripe Test Cards

### 1. Prerequisites
- [ ] Stripe account in **Test Mode**
- [ ] Valid Stripe test API keys in `.env`
- [ ] Server deployed and running

### 2. Stripe Test Cards

#### ✅ Successful Payment Cards

| Card Number | Description | Use Case |
|------------|-------------|----------|
| `4242 4242 4242 4242` | Visa - Always succeeds | Primary testing |
| `4000 0562 0000 0004` | Visa (debit) - Always succeeds | Debit card testing |
| `5555 5555 4444 4242` | Mastercard - Always succeeds | Alternative card brand |
| `3782 822463 10005` | American Express - Always succeeds | Amex testing |

**For all test cards use:**
- **Expiry:** Any future date (e.g., `12/34`)
- **CVC:** Any 3 digits (4 digits for Amex)
- **ZIP:** Any 5 digits

#### ❌ Declined Payment Cards

| Card Number | Description | Error Code |
|------------|-------------|------------|
| `4000 0000 0000 0002` | Generic decline | `card_declined` |
| `4000 0000 0000 9995` | Insufficient funds | `insufficient_funds` |
| `4000 0000 0000 9987` | Lost card | `lost_card` |
| `4000 0000 0000 0069` | Expired card | `expired_card` |
| `4000 0000 0000 0127` | Incorrect CVC | `incorrect_cvc` |
| `4000 0000 0000 0119` | Processing error | `processing_error` |

#### 🌍 3D Secure Authentication Cards

| Card Number | Description | Behavior |
|------------|-------------|----------|
| `4000 0000 0000 3220` | 3DS required | Always authenticates successfully |
| `4000 0000 0000 3212` | 3DS required | Always fails authentication |
| `4000 0025 0000 3155` | 3DS required | Requires authentication |
| `4000 0000 0000 3055` | 3DS supported but not required | Optional authentication |

### 3. Step-by-Step Testing Process

#### A. Basic Payment Flow Test

1. **Navigate to Pricing Page**
   ```
   https://rinawarptech.com/pricing
   ```

2. **Select a Plan**
   - Click "Start Free Trial" on any plan
   - Basic ($29), Professional ($99), or Enterprise ($299)

3. **Fill Checkout Form**
   ```
   Email: test@example.com
   Card: 4242 4242 4242 4242
   Expiry: 12/34
   CVC: 123
   Name: Test User
   ZIP: 12345
   ```

4. **Complete Payment**
   - Click "Subscribe" or "Start trial"
   - Wait for processing

5. **Verify Success**
   - Should redirect to `/success` page
   - Check for order confirmation
   - Verify plan details are shown

#### B. Testing Different Scenarios

**Test 1: Successful Payment**
```bash
# Use card: 4242 4242 4242 4242
# Expected: Payment succeeds, redirects to success page
```

**Test 2: Declined Payment**
```bash
# Use card: 4000 0000 0000 0002
# Expected: Shows "Your card was declined" error
```

**Test 3: 3D Secure**
```bash
# Use card: 4000 0000 0000 3220
# Expected: Shows 3D Secure popup, then succeeds
```

**Test 4: Network Error**
```bash
# Disconnect internet after loading checkout
# Expected: Shows network error message
```

### 4. Verifying in Stripe Dashboard

1. **Login to Stripe Dashboard**
   - Go to https://dashboard.stripe.com
   - Ensure you're in **Test mode** (toggle in header)

2. **Check Payments**
   - Navigate to Payments → All Transactions
   - Find your test payment
   - Verify amount and status

3. **Check Customers**
   - Navigate to Customers
   - Find test@example.com
   - Verify subscription created

4. **Check Subscriptions**
   - Navigate to Subscriptions
   - Verify subscription is active
   - Check plan details match

### 5. API Testing with cURL

**Test Payment Config Endpoint:**
```bash
curl https://rinawarptech.com/api/payment/config
```

**Test Checkout Session Creation:**
```bash
curl -X POST https://rinawarptech.com/api/payment/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{
    "plan": "basic",
    "successUrl": "https://rinawarptech.com/success",
    "cancelUrl": "https://rinawarptech.com/pricing"
  }'
```

### 6. Webhook Testing

**Using Stripe CLI:**
```bash
# Install Stripe CLI first
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:3000/api/payment/webhook

# In another terminal, trigger test events
stripe trigger payment_intent.succeeded
```

### 7. Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "No such price" | Create products in Stripe Dashboard |
| "Invalid API key" | Check `.env` file has correct keys |
| "CORS error" | Verify domain in Stripe settings |
| "Card declined" | Use successful test card number |
| "Network error" | Check server is running |
| "Invalid email" | Use valid email format |

### 8. Testing Checklist

- [ ] **Basic Flow**
  - [ ] Can access pricing page
  - [ ] Pricing shows correctly ($29, $99, $299)
  - [ ] Can click purchase buttons
  - [ ] Redirects to Stripe Checkout

- [ ] **Checkout Page**
  - [ ] Shows correct product name
  - [ ] Shows correct price
  - [ ] Can enter card details
  - [ ] Can complete payment

- [ ] **Success Flow**
  - [ ] Redirects to success page
  - [ ] Shows order confirmation
  - [ ] Displays correct plan details
  - [ ] Receives confirmation email (if configured)

- [ ] **Error Handling**
  - [ ] Declined cards show error
  - [ ] Network errors handled gracefully
  - [ ] Can retry after failure
  - [ ] Cancel returns to pricing page

### 9. Production Testing

When ready for production:

1. **Switch to Live Mode**
   - Update `.env` with live Stripe keys
   - Deploy to production

2. **Test with Real Card** (Small amount)
   - Use your own card
   - Choose lowest price plan
   - Immediately cancel subscription

3. **Verify Live Dashboard**
   - Check payment appeared
   - Refund test payment
   - Verify webhook received

### 10. Monitoring Payments

**Set up alerts for:**
- Failed payments
- Successful conversions
- Subscription cancellations
- Chargebacks

**Track metrics:**
- Conversion rate
- Average order value
- Payment success rate
- Common failure reasons

---

## 🚀 Quick Test Commands

```bash
# Test local payment flow
node test-payment-flow.js

# Monitor live site
node website-monitor.js

# Check pre-deployment
node pre-deploy-check.js

# View Railway logs
railway logs --tail
```

## 📞 Support

- **Stripe Support**: https://support.stripe.com
- **Test Mode Docs**: https://stripe.com/docs/testing
- **RinaWarp Support**: support@rinawarptech.com

Remember: Always test in Test Mode first! 🧪
