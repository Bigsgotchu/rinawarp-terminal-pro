# 🔧 Cloudflare Transform Rule for CSP Fix

This document provides the exact configuration needed to fix the CSP `frame-src 'none'` issue that's blocking Stripe iframes in production.

## 🚨 Problem

Your server correctly sets CSP headers with `frame-src 'self' https://js.stripe.com https://hooks.stripe.com`, but Cloudflare is overriding this with `frame-src 'none'`, which blocks all iframes including Stripe payment forms.

## ✅ Solution: Cloudflare Transform Rules

### Step 1: Access Transform Rules
1. Log into your Cloudflare Dashboard
2. Select your domain (`rinawarptech.com`)
3. Go to **Rules** → **Transform Rules**
4. Click **Create rule** → **Modify Response Header**

### Step 2: Configure the Rule

**Rule Name:** `Fix CSP for Stripe Integration`

**When incoming requests match:**
- Field: `Hostname`
- Operator: `equals`
- Value: `rinawarptech.com`

**Then:**
- Action: `Set dynamic`
- Header name: `Content-Security-Policy`
- Expression:
```javascript
concat(
  "default-src 'self'; ",
  "script-src 'self' https://js.stripe.com 'nonce-", 
  http.request.headers["x-nonce"][0] || "unknown", 
  "'; ",
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com; ",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; ",
  "img-src 'self' data: https:; ",
  "font-src 'self' data: https://fonts.gstatic.com; ",
  "connect-src 'self' wss: ws: https://api.stripe.com; ",
  "object-src 'none'; ",
  "base-uri 'self'; ",
  "form-action 'self'; ",
  "frame-ancestors 'self'; ",
  "script-src-attr 'none'; ",
  "upgrade-insecure-requests"
)
```

**Priority:** Set to `1` (highest priority)

### Step 3: Alternative Simplified Expression

If the above expression doesn't work, try this simplified version:

```javascript
"default-src 'self'; script-src 'self' https://js.stripe.com 'unsafe-inline'; frame-src 'self' https://js.stripe.com https://hooks.stripe.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' wss: ws: https://api.stripe.com; object-src 'none'; base-uri 'self'; form-action 'self'; script-src-attr 'none'; upgrade-insecure-requests"
```

## 🛠️ Alternative: Cloudflare Worker

If Transform Rules don't work, deploy this Worker:

```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const response = await fetch(request)
  
  // Clone the response to modify headers
  const newResponse = new Response(response.body, response)
  
  // Get existing CSP
  const csp = newResponse.headers.get('Content-Security-Policy')
  
  if (csp && csp.includes("frame-src 'none'")) {
    // Fix the CSP by replacing frame-src 'none' with proper Stripe domains
    const fixedCSP = csp.replace(
      "frame-src 'none'", 
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com"
    )
    newResponse.headers.set('Content-Security-Policy', fixedCSP)
    console.log('CSP fixed for Stripe compatibility')
  } else if (!csp) {
    // Set a complete CSP if none exists
    const newCSP = "default-src 'self'; script-src 'self' https://js.stripe.com 'unsafe-inline'; frame-src 'self' https://js.stripe.com https://hooks.stripe.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' wss: ws: https://api.stripe.com; object-src 'none'; base-uri 'self'; form-action 'self'; script-src-attr 'none'; upgrade-insecure-requests"
    newResponse.headers.set('Content-Security-Policy', newCSP)
    console.log('CSP set for Stripe compatibility')
  }
  
  return newResponse
}
```

## 🧪 Testing After Implementation

1. **Wait 5-10 minutes** for changes to propagate
2. Visit: `https://rinawarptech.com/stripe-csp-test.html`
3. Check browser console for CSP violations
4. Verify Stripe Elements load correctly
5. Test a complete checkout flow

## 🔍 Verification Commands

Test the CSP header from command line:

```bash
# Check current CSP header
curl -I https://rinawarptech.com | grep -i content-security-policy

# Expected result should include:
# frame-src 'self' https://js.stripe.com https://hooks.stripe.com
# NOT frame-src 'none'
```

## 📊 Monitoring

After implementing the fix, monitor for:

1. **No CSP violations** in browser console
2. **Stripe Elements loading** successfully
3. **Payment forms working** correctly
4. **No blocked iframe requests**

## 🚨 Troubleshooting

### If the Transform Rule doesn't apply:
1. Check the rule priority (should be 1)
2. Verify the hostname condition matches exactly
3. Wait 10-15 minutes for propagation
4. Clear browser cache and test again

### If Stripe is still blocked:
1. Check browser dev tools for specific CSP violations
2. Verify the CSP header in Network tab
3. Test with the CSP test page
4. Consider using the Worker approach instead

### Still having issues?
1. Disable other Cloudflare security features temporarily
2. Check for multiple CSP headers being set
3. Contact Cloudflare support with specific CSP violation details

---

## 📝 Summary

The issue is that Cloudflare's security settings are overriding your server's correct CSP configuration. By using Transform Rules or Workers, you can ensure that `frame-src` allows Stripe domains while maintaining security for everything else.

This fix maintains all your existing security policies while specifically allowing the Stripe domains needed for payment processing.
