# 🧜‍♀️ RinaWarp Terminal - Master Pricing Structure

**Last Updated**: August 9, 2025  
**Status**: ✅ CONSOLIDATED - Single Source of Truth

## 🌊 **MASTER PRICING - Monthly Subscriptions**

### **🚀 Free Starter**
- **Price**: $0/month
- **Target**: Getting started users
- **Features**: Basic terminal, limited AI (20 queries/day), 6 themes, 2 devices

### **🐟 Reef Explorer (Personal)**
- **Price**: $15/month 
- **Annual**: $144/year (20% off)
- **Target**: Individual developers
- **Features**: Full terminal, basic AI, 20+ themes, 3 devices

### **🧜‍♀️ Mermaid Pro (Professional)** ⭐ MOST POPULAR
- **Price**: $25/month
- **Annual**: $240/year (20% off)  
- **Target**: Professional developers
- **Features**: Advanced AI, unlimited queries, custom themes, 5 devices, priority support

### **🌊 Ocean Fleet (Team)**
- **Price**: $35/month
- **Annual**: $336/year (20% off)
- **Target**: Development teams
- **Features**: Everything in Pro + team collaboration, shared configs, admin dashboard, 10 devices

### **🏢 Enterprise Navigator**
- **Price**: Custom pricing
- **Target**: Large organizations  
- **Features**: Everything + SSO, audit logs, unlimited devices, 24/7 support, dedicated manager

---

## 🚀 **BETA ACCESS - One-time Purchases**

### **🐦 Early Bird**
- **Price**: $29 (one-time)
- **Includes**: Beta access + full license on release + early feature preview

### **🚀 Beta Access** ⭐ MOST POPULAR  
- **Price**: $39 (one-time)
- **Includes**: Beta access + full license + priority feature requests + developer access

### **👑 Premium Beta**
- **Price**: $59 (one-time)
- **Includes**: All beta features + team features + premium support

---

## 📍 **ACTIVE PRICING PAGES**

### ✅ **PRIMARY (Source of Truth)**
- `/public/pricing.html` - Main pricing page on website
- `/src/config/pricing-tiers.js` - Technical configuration

### ✅ **SUPPORTING PAGES** 
- `/public/checkout.html` - Checkout flow (matches main pricing)
- `/public/simple-payment-test.html` - Payment testing (matches main pricing)
- `/pricing.html` - Root redirect (points to main pricing)

### ❌ **DEPRECATED/CONFLICTING** (Fixed or Removed)
- Old pricing pages moved to `/deprecated/` folder
- AB tests and old configurations archived
- Root pricing.html now redirects to main page

---

## 💰 **REVENUE MODEL**

### **Subscription Revenue** (Primary)
- **Monthly recurring billing** via Stripe
- **Automatic renewals** with 30-day cancellation
- **Annual discounts** of 20% to encourage longer commitments
- **Prorated upgrades/downgrades** 

### **Beta Revenue** (Secondary)
- **One-time payments** for early access
- **Includes full license** when product releases
- **Higher lifetime value** from early adopters

---

## 🔄 **RELEASE IMPACT ON PRICING**

### **For Active Subscribers**
- Get all new releases automatically (v1.0.0 → v1.1.0)
- No additional charges for updates during subscription
- New features encourage retention and reduce churn

### **For New Customers**
- Always get the latest version immediately upon subscription
- Pricing stays consistent regardless of version
- Value perception increases with each release

---

## 🎯 **CUSTOMER JOURNEY**

1. **Discovery** → Visit website, see v1.1.0 Enhanced AI Edition
2. **Evaluation** → Try Free Starter plan
3. **Conversion** → Upgrade to Mermaid Pro ($25/month) 
4. **Retention** → Receive automatic updates, stay subscribed
5. **Expansion** → Upgrade to team plans as needs grow

---

## ⚙️ **STRIPE INTEGRATION**

### **Price IDs** (Environment Variables)
- `STRIPE_PRICE_PERSONAL_MONTHLY`
- `STRIPE_PRICE_PROFESSIONAL_MONTHLY` 
- `STRIPE_PRICE_TEAM_MONTHLY`
- `STRIPE_PRICE_BETA_EARLY`
- `STRIPE_PRICE_BETA_STANDARD`
- `STRIPE_PRICE_BETA_PREMIUM`

### **Webhooks**
- Subscription created/updated
- Payment succeeded/failed
- Customer portal sessions

---

## 🚨 **PRICING CONSISTENCY CHECKLIST**

- ✅ All pricing pages use same prices
- ✅ Checkout flows match main pricing  
- ✅ Payment tests use correct amounts
- ✅ Marketing copy consistent across pages
- ✅ Stripe price IDs properly mapped
- ✅ Currency and formatting standardized
- ✅ Annual discounts calculated correctly
- ✅ Beta pricing separate from subscriptions

---

## 🔧 **MAINTENANCE COMMANDS**

### **Verify Pricing Consistency**
```bash
node scripts/consolidate-pricing.cjs
```

### **Update Download Page Version**
```bash
node scripts/update-download-links.cjs
```

### **Release New Version**
```bash
npm run workflow:release
```

---

## 🌟 **KEY BENEFITS OF CONSOLIDATED PRICING**

1. **Customer Clarity** - No confusing mixed messages
2. **Team Alignment** - Single source of truth for all stakeholders  
3. **Easy Updates** - Change pricing in one place, propagate everywhere
4. **A/B Testing** - Can test variations while maintaining consistency
5. **Compliance** - Accurate billing and legal compliance
6. **Analytics** - Clean data for pricing optimization

---

*May your pricing flow like gentle tides, guiding customers smoothly to conversion! 🌊✨*

## 📊 **Analytics & Optimization**

Track key metrics:
- **Conversion rates** by pricing tier
- **Customer lifetime value** (LTV) 
- **Churn rates** by plan
- **Upgrade/downgrade patterns**
- **Annual vs monthly preferences**
- **Beta conversion to paid**

*Last reviewed by pricing consolidation script: August 9, 2025*
