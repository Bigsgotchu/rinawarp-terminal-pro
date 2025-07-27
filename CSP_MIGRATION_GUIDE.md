# CSP Inline Handler Migration Guide

## What Changed?
We've removed all inline event handlers (onclick, onload, etc.) to comply with Content Security Policy (CSP) best practices. This makes the website more secure against XSS attacks.

## How to Update Your Code

### Before (Insecure):
```html
<button onclick="purchasePlan('basic')">Buy Basic Plan</button>
```

### After (Secure):
```html
<button data-plan="basic" class="purchase-button">Buy Basic Plan</button>
```

```javascript
document.querySelectorAll('.purchase-button').forEach(button => {
  button.addEventListener('click', function() {
    const plan = this.getAttribute('data-plan');
    purchasePlan(plan);
  });
});
```

## Quick Fixes Applied:

1. **Automatic Handler Conversion**: Inline handlers are converted to data attributes with unique IDs
2. **Safe Event Handler Utility**: Automatically attaches event listeners to elements
3. **CSP Headers Updated**: Blocks all inline event handlers for maximum security

## Include Safe Handler Script:
Add this to your HTML files before closing </body>:
```html
<script src="/public/js/safe-event-handler.js"></script>
```

## Testing:
1. Check browser console for CSP violations
2. Verify all buttons and forms still work
3. Test payment flow with Stripe
