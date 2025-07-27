# 🧪 CSP Report-Only Testing Guide

## Current Setup

Your server now sends **two** CSP headers:

1. **Content-Security-Policy** (Enforced) - Your current working policy
2. **Content-Security-Policy-Report-Only** (Testing) - Strict policy for evaluation

## Report-Only Policy Being Tested

```
script-src 'self' https://js.stripe.com https://checkout.stripe.com https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com
```

Key differences from current policy:
- ❌ No `'unsafe-inline'` for scripts
- ❌ No `'nonce-{dynamic}'` (testing without it)
- ❌ No `'unsafe-inline'` for styles (also testing strict styles)

## How to Test

### 1. Start the CSP Monitor
```bash
# In a separate terminal
node monitor-csp-violations.js
```

### 2. Deploy Your Changes
```bash
git add -A
git commit -m "test: add CSP report-only mode for strict policy evaluation"
git push
```

### 3. Test Your Live Site
Visit each page and interact with all features:

- [ ] **Homepage** - https://rinawarptech.com
  - Check all animations
  - Test any interactive elements
  
- [ ] **Pricing Page** - https://rinawarptech.com/pricing
  - Click all pricing buttons
  - Test hover effects
  - Verify button redirects
  
- [ ] **Checkout Flow**
  - Click "Get Started" buttons
  - Proceed through checkout
  - Test with Stripe test card: 4242 4242 4242 4242
  
- [ ] **Success Page**
  - Complete a test purchase
  - Verify success page loads

### 4. Check for Violations

#### Browser Console
Open Developer Tools (F12) and look for:
```
[Report Only] Refused to execute inline script because it violates the following Content Security Policy directive...
```

#### Server Logs
Watch your server logs for:
```
🚨 CSP Violation Report:
  - Document: https://rinawarptech.com/pricing
  - Blocked: inline
  - Directive: script-src
```

#### Violation Log File
Check `./logs/csp-violations.log` for detailed reports

## Understanding Violations

### Expected Violations (Already Fixed)
Since we've removed inline handlers, you should NOT see:
- ❌ onclick handler violations
- ❌ onmouseover handler violations
- ❌ onmouseout handler violations

### Possible New Violations

1. **Google Analytics/GTM**
   ```
   Blocked: https://www.googletagmanager.com/gtag/js
   ```
   **Action**: Already included in policy ✅

2. **Stripe.js**
   ```
   Blocked: https://js.stripe.com/v3/
   ```
   **Action**: Already included in policy ✅

3. **Inline Styles**
   ```
   Directive: style-src
   Blocked: inline
   ```
   **Action**: These are expected - we're testing strict styles

## Decision Tree

After testing for 24-48 hours:

### ✅ No Script Violations
1. Remove report-only mode
2. Enforce strict CSP
3. Continue monitoring

### ⚠️ Minor Violations (styles only)
1. Keep strict script-src
2. Allow 'unsafe-inline' for styles temporarily
3. Plan CSS migration

### ❌ Critical Violations
1. Identify and fix issues
2. Continue report-only testing
3. Deploy fixes and retest

## Remove Report-Only Mode

Once testing is complete and no violations found:

```javascript
// Remove the report-only middleware
// Keep the strict CSP in helmet configuration
```

## Monitoring Commands

```bash
# Watch violations in real-time
node monitor-csp-violations.js

# Check violation log
cat logs/csp-violations.log | jq .

# Count violations by type
grep "violated-directive" logs/csp-violations.log | sort | uniq -c

# Clear violation log (after review)
echo "" > logs/csp-violations.log
```

## Best Practices

1. **Test during peak hours** - More users = better coverage
2. **Test all user flows** - Don't just load pages, interact with them
3. **Monitor for 24-48 hours** - Catch edge cases
4. **Document any violations** - Before making policy changes
5. **Fix don't relax** - Try to fix code rather than relax policy

---

**Remember**: Report-Only mode lets you test safely without breaking anything! 🛡️
