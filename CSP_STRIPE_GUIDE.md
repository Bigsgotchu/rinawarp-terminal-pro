# 🔐 CSP & Stripe Integration Guide

## 🚨 Current CSP Configuration Status

Based on your `server.js` file, your CSP configuration **already includes** the correct Stripe domains:

```javascript
frameSrc: ['https://js.stripe.com', 'https://hooks.stripe.com'],
scriptSrc: ['self', 'https://js.stripe.com', (req, res) => `'nonce-${res.locals.nonce}'`],
connectSrc: ['self', 'wss:', 'ws:', 'https://api.stripe.com'],
```

✅ **Your CSP should already be working with Stripe!**

## 🔍 Troubleshooting Steps

### 1. Test Your Current Configuration

Run the test script to verify your headers:

```bash
cd /Users/kgilley/rinawarp-terminal
node test-csp-stripe.js
```

### 2. Check Browser Console

Open your browser's Developer Tools (F12) and look for CSP violations:
- Red errors mentioning "Content Security Policy"
- Messages about blocked resources
- Frame/iframe loading errors

### 3. Common Issues & Solutions

#### Issue: "Refused to frame 'https://js.stripe.com/...'"
**Your config already has the fix**, but if still seeing errors:
```javascript
frameSrc: ['self', 'https://js.stripe.com', 'https://hooks.stripe.com'],
```

#### Issue: "Refused to execute inline event handler"
This is **expected behavior** with `script-src-attr: 'none'`. 

**Solutions:**
1. **Refactor inline handlers** (Recommended):
   ```html
   <!-- ❌ Bad: Inline onclick -->
   <button onclick="handlePayment()">Pay</button>
   
   <!-- ✅ Good: External handler -->
   <button id="pay-button">Pay</button>
   <script nonce="YOUR_NONCE">
     document.getElementById('pay-button').addEventListener('click', handlePayment);
   </script>
   ```

2. **Use data attributes**:
   ```html
   <button data-action="payment">Pay</button>
   <script nonce="YOUR_NONCE">
     document.querySelectorAll('[data-action]').forEach(el => {
       el.addEventListener('click', e => {
         const action = e.target.dataset.action;
         if (action === 'payment') handlePayment();
       });
     });
   </script>
   ```

#### Issue: "Refused to load the script 'https://js.stripe.com/v3/'"
Check if your nonce is being properly generated:
```javascript
// In your HTML template
<script src="https://js.stripe.com/v3/"></script>
<script nonce="<%= nonce %>">
  // Your Stripe initialization code
</script>
```

## 📋 Complete Working Example

### Server-side (already in your server.js):
```javascript
// Nonce generation middleware
app.use((req, res, next) => {
  res.locals.nonce = generateNonce();
  next();
});

// CSP configuration
contentSecurityPolicy: {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'", 
      'https://js.stripe.com',
      (req, res) => `'nonce-${res.locals.nonce}'`
    ],
    frameSrc: ['https://js.stripe.com', 'https://hooks.stripe.com'],
    connectSrc: ["'self'", 'https://api.stripe.com'],
    // ... other directives
  }
}
```

### Client-side HTML:
```html
<!DOCTYPE html>
<html>
<head>
    <title>Stripe Payment</title>
    <!-- External Stripe script - no nonce needed -->
    <script src="https://js.stripe.com/v3/"></script>
</head>
<body>
    <form id="payment-form">
        <div id="card-element"></div>
        <button id="submit-button" type="submit">Pay Now</button>
        <div id="error-message"></div>
    </form>

    <!-- Your script needs nonce -->
    <script nonce="<%= nonce %>">
        // Initialize Stripe
        const stripe = Stripe('YOUR_PUBLISHABLE_KEY');
        const elements = stripe.elements();
        
        // Create card element
        const cardElement = elements.create('card');
        cardElement.mount('#card-element');
        
        // Handle form submission
        const form = document.getElementById('payment-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const {error, paymentMethod} = await stripe.createPaymentMethod({
                type: 'card',
                card: cardElement,
            });
            
            if (error) {
                document.getElementById('error-message').textContent = error.message;
            } else {
                // Send paymentMethod.id to your server
                const response = await fetch('/api/create-payment-session', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        paymentMethodId: paymentMethod.id
                    })
                });
                
                const result = await response.json();
                if (result.error) {
                    document.getElementById('error-message').textContent = result.error;
                } else {
                    // Payment successful
                    window.location.href = '/success';
                }
            }
        });
    </script>
</body>
</html>
```

## 🛠️ Quick Fixes

### If Stripe is still blocked after verification:

1. **Temporary Test** (NOT for production):
   ```javascript
   // Add 'unsafe-inline' temporarily to identify the issue
   scriptSrc: ["'self'", "'unsafe-inline'", 'https://js.stripe.com'],
   ```

2. **Check for typos** in domain names:
   - ✅ `https://js.stripe.com` (correct)
   - ❌ `https://stripe.com` (wrong)
   - ❌ `https://www.stripe.com` (wrong)

3. **Ensure HTTPS** in production:
   - CSP upgrade-insecure-requests will block HTTP resources
   - All Stripe resources must use HTTPS

## 🔄 Alternative CSP Configuration

If you need a more permissive configuration for testing:

```javascript
contentSecurityPolicy: {
  useDefaults: false,
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      "'unsafe-inline'", // Only for testing!
      'https://js.stripe.com',
      'https://checkout.stripe.com'
    ],
    frameSrc: [
      "'self'",
      'https://js.stripe.com',
      'https://hooks.stripe.com',
      'https://checkout.stripe.com'
    ],
    connectSrc: [
      "'self'",
      'https://api.stripe.com',
      'https://checkout.stripe.com'
    ],
    imgSrc: ["'self'", 'data:', 'https:', 'https://stripe.com'],
    styleSrc: ["'self'", "'unsafe-inline'"],
  }
}
```

## 📊 Verification Checklist

- [ ] Run `node test-csp-stripe.js` - all checks pass
- [ ] No CSP errors in browser console
- [ ] Stripe card element loads properly
- [ ] Payment form can be submitted
- [ ] Stripe checkout redirects work
- [ ] No inline event handlers in code

## 🚀 Deployment Notes

1. **Test locally first** with your exact production CSP
2. **Monitor CSP reports** if you've set up reporting
3. **Use browser dev tools** to catch violations
4. **Test all payment flows** after any CSP changes

## 💡 Pro Tips

1. **Never use `'unsafe-inline'`** in production
2. **Always use nonces** for inline scripts
3. **Test with real Stripe keys** in a test environment
4. **Monitor for CSP violations** in production logs
5. **Keep Stripe domains updated** as they may change

---

Remember: Your current configuration should already work! If you're still having issues, the problem might be elsewhere (like template rendering, nonce generation, or client-side code).
