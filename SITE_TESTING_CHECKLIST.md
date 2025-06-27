# 🧪 SITE TESTING CHECKLIST - DO THIS NOW!

## ✅ **CRITICAL TESTS (5 minutes)**

### **Homepage Test:**
1. ✅ Go to: https://rinawarp-terminal.netlify.app/
2. ✅ Verify homepage loads (not pricing page)
3. ✅ Check no 502 errors in browser console (F12)
4. ✅ Click "Get Started" button works
5. ✅ Navigation menu works

### **Pricing Page Test:**
1. ✅ Go to: https://rinawarp-terminal.netlify.app/pricing.html
2. ✅ All pricing cards display correctly
3. ✅ No console errors (F12 → Console tab)
4. ✅ Click "Start Professional" button
5. ✅ Stripe checkout opens (DON'T complete payment)

### **Payment System Test:**
1. ✅ In Stripe checkout, enter test data:
   - Email: test@example.com
   - Card: 4242 4242 4242 4242
   - Expiry: 12/34, CVC: 123
2. ✅ Click "Subscribe" - should work
3. ✅ Cancel test payment

## 🚨 **IF ANYTHING FAILS:**
- Note the error
- Check browser console for errors
- Test in different browser (Chrome/Firefox)
- Clear cache and try again

## ✅ **STRIPE DOMAIN FIX (Required for payments):**

1. Go to: https://dashboard.stripe.com/account/checkout/settings
2. Add domain: `rinawarp-terminal.netlify.app`
3. Click "Add domain"

## 📊 **WHAT SUCCESS LOOKS LIKE:**
- ✅ Homepage loads cleanly
- ✅ Pricing page shows all plans
- ✅ Stripe checkout opens
- ✅ No console errors
- ✅ Professional appearance

**TIME NEEDED: 5 minutes**
**PRIORITY: CRITICAL - Do this first!**
